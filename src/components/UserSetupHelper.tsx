import React from "react";

const UserSetupHelper: React.FC = () => {
  const setupUserData = async () => {
    try {
      // This would need to be run in Supabase SQL Editor
      const sqlScript = `
-- Create profile and initial data for authenticated user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  timezone,
  hourly_rate,
  currency,
  created_at,
  updated_at
) VALUES (
  '809eff3f-98c7-4743-b4ad-715f9597a321',
  'stanfordm615@gmail.com',
  'Stanford',
  'America/New_York',
  75.00,
  'USD',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();`;

      // Copy to clipboard
      await navigator.clipboard.writeText(sqlScript);
      alert(
        "SQL script copied to clipboard! Please paste and run in Supabase SQL Editor."
      );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="fixed top-20 right-4 w-80 bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4 z-50">
      <h3 className="font-bold text-yellow-800 mb-2">User Setup Required</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Your user account needs to be set up in the database.
      </p>
      <button
        onClick={setupUserData}
        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
      >
        Copy SQL Script
      </button>
      <p className="text-xs text-yellow-600 mt-2">
        After copying, paste and run in Supabase SQL Editor, then refresh this
        page.
      </p>
    </div>
  );
};

export default UserSetupHelper;
