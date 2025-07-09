import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Clock,
  Mail,
  Lock,
  User,
  Chrome,
  AlertCircle,
  Loader2,
  Heart,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const { themeType } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required";
    if (password.length < 6)
      return "Password must be at least 6 characters long";
    return "";
  };

  const validateFullName = (fullName: string) => {
    if (isSignUp && !fullName.trim()) return "Full name is required";
    if (isSignUp && fullName.trim().length < 2)
      return "Full name must be at least 2 characters";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const fullNameError = validateFullName(formData.fullName);

    if (emailError || passwordError || fullNameError) {
      setFieldErrors({
        email: emailError,
        password: passwordError,
        fullName: fullNameError,
      });
      setLoading(false);
      return;
    }

    // Clear field errors
    setFieldErrors({ email: "", password: "", fullName: "" });

    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setInfoMessage(
            "Please check your email for a confirmation link before signing in."
          );
          setIsSignUp(false);
        } else if (data.session) {
          onAuthSuccess();
        }
      } else {
        // Sign in existing user
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during authentication"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during Google sign in"
      );
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: "", password: "", fullName: "" });
    setError(null);
    setInfoMessage(null);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "" };
    if (password.length < 6)
      return { strength: 1, label: "Too short", color: "text-red-500" };
    if (password.length < 8)
      return { strength: 2, label: "Weak", color: "text-orange-500" };

    let score = 2;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    if (score >= 5)
      return { strength: 4, label: "Strong", color: "text-green-500" };
    if (score >= 4)
      return { strength: 3, label: "Good", color: "text-blue-500" };
    return { strength: 2, label: "Fair", color: "text-yellow-500" };
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        themeType === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900"
          : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
      }`}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Time Tracker</h1>
          <p className="text-secondary">
            {isSignUp
              ? "Create your account to get started"
              : "Welcome back! Please sign in to continue"}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-surface rounded-2xl shadow-xl p-8 border border-border">
          {error && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center border ${
                themeType === "dark"
                  ? "bg-red-900/20 border-red-800 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 mr-2 flex-shrink-0 ${
                  themeType === "dark" ? "text-red-400" : "text-red-600"
                }`}
              />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {infoMessage && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center border ${
                themeType === "dark"
                  ? "bg-blue-900/20 border-blue-800 text-blue-300"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              <Mail className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
              <span className="text-sm">{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label
                  htmlFor="auth-full-name"
                  className="block text-sm font-medium text-primary mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
                  <input
                    type="text"
                    id="auth-full-name"
                    name="authFullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (fieldErrors.fullName) {
                        setFieldErrors({
                          ...fieldErrors,
                          fullName: validateFullName(e.target.value),
                        });
                      }
                    }}
                    onBlur={(e) =>
                      setFieldErrors({
                        ...fieldErrors,
                        fullName: validateFullName(e.target.value),
                      })
                    }
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-surface text-primary ${
                      fieldErrors.fullName ? "border-red-500" : "border-theme"
                    }`}
                    placeholder="Enter your full name"
                    required={isSignUp}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-primary mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="email"
                  id="auth-email"
                  name="authEmail"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) {
                      setFieldErrors({
                        ...fieldErrors,
                        email: validateEmail(e.target.value),
                      });
                    }
                  }}
                  onBlur={(e) =>
                    setFieldErrors({
                      ...fieldErrors,
                      email: validateEmail(e.target.value),
                    })
                  }
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-surface text-primary ${
                    fieldErrors.email ? "border-red-500" : "border-theme"
                  }`}
                  placeholder="Enter your email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-primary mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="password"
                  id="auth-password"
                  name="authPassword"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) {
                      setFieldErrors({
                        ...fieldErrors,
                        password: validatePassword(e.target.value),
                      });
                    }
                  }}
                  onBlur={(e) =>
                    setFieldErrors({
                      ...fieldErrors,
                      password: validatePassword(e.target.value),
                    })
                  }
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-surface text-primary ${
                    fieldErrors.password ? "border-red-500" : "border-theme"
                  }`}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.password}
                </p>
              )}
              {isSignUp && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted">
                    Password must be at least 6 characters long
                  </p>
                  {formData.password && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">
                          Password strength:
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            getPasswordStrength(formData.password).color
                          }`}
                        >
                          {getPasswordStrength(formData.password).label}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <=
                              getPasswordStrength(formData.password).strength
                                ? getPasswordStrength(formData.password)
                                    .strength === 1
                                  ? "bg-red-500"
                                  : getPasswordStrength(formData.password)
                                      .strength === 2
                                  ? "bg-orange-500"
                                  : getPasswordStrength(formData.password)
                                      .strength === 3
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                                : themeType === "dark"
                                ? "bg-gray-700"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </div>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm text-muted">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-border rounded-lg text-secondary bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Chrome className="h-5 w-5 mr-2" />
            Continue with Google
          </button>

          {/* Toggle between Sign In/Sign Up */}
          <div className="mt-6 text-center">
            <p className="text-sm text-secondary">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className={`font-medium focus:outline-none focus:underline ${
                  themeType === "dark"
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-700"
                }`}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <p className="text-sm text-muted">
            Secure authentication powered by Supabase
          </p>

          {/* Company branding */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted">
            <span className="flex items-center space-x-1">
              <span>Designed with</span>
              <Heart
                className={`h-3 w-3 fill-current ${
                  themeType === "dark" ? "text-rose-400/70" : "text-rose-500/70"
                }`}
              />
              <span>by</span>
            </span>
            <a
              href="https://mjswebdesign.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center font-medium transition-colors ${
                themeType === "dark"
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              <span>MJS Web Design</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
