import React, { useState, useEffect } from "react";

interface FadeTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  duration?: number;
}

const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  isVisible,
  duration = 200,
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [opacity, setOpacity] = useState(isVisible ? 1 : 0);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure element is rendered before fading in
      const fadeInTimer = setTimeout(() => setOpacity(1), 10);
      return () => clearTimeout(fadeInTimer);
    } else {
      setOpacity(0);
      // Wait for fade out to complete before removing from DOM
      const removeTimer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(removeTimer);
    }
  }, [isVisible, duration]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        opacity,
        transition: `opacity ${duration}ms ease-in-out`,
      }}
    >
      {children}
    </div>
  );
};

export default FadeTransition;
