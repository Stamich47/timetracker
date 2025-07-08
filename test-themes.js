// Simple theme testing script for browser console
// Run this in the browser console to test theme switching

console.log("🎨 Testing Time Tracker Theme System");

if (window.themeManager) {
  const manager = window.themeManager;

  console.log("Available themes:", [
    "default",
    "light",
    "dark",
    "ocean",
    "forest",
    "sunset",
  ]);
  console.log("Current theme:", manager.getCurrentThemeType());

  // Test theme switching
  const themes = ["default", "light", "dark", "ocean", "forest", "sunset"];
  let currentIndex = 0;

  function nextTheme() {
    currentIndex = (currentIndex + 1) % themes.length;
    const theme = themes[currentIndex];
    manager.setTheme(theme);
    console.log(`✅ Switched to theme: ${theme}`);
    console.log(
      "Background color:",
      getComputedStyle(document.body).backgroundColor
    );
    console.log(
      "Primary color:",
      getComputedStyle(document.documentElement).getPropertyValue(
        "--color-primary"
      )
    );
  }

  function testAllThemes() {
    console.log("🔄 Testing all themes...");
    themes.forEach((theme, index) => {
      setTimeout(() => {
        manager.setTheme(theme);
        console.log(`${index + 1}. Applied theme: ${theme}`);
        if (index === themes.length - 1) {
          console.log("✨ Theme testing complete!");
        }
      }, index * 1000);
    });
  }

  // Make functions globally available
  window.nextTheme = nextTheme;
  window.testAllThemes = testAllThemes;

  console.log("🚀 Theme testing ready!");
  console.log("• Run window.nextTheme() to switch to next theme");
  console.log("• Run window.testAllThemes() to cycle through all themes");
  console.log("• Run window.themeManager.debugThemes() for debug info");
} else {
  console.error(
    "❌ Theme manager not found. Make sure you're in development mode."
  );
}
