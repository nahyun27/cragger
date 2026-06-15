export function getAvatarBgColor(name: string, isDark: boolean) {
  const lightColors = ['#e0f2fe', '#fef3c7', '#dcfce7', '#f3e8ff', '#fee2e2', '#e0e7ff'];
  const darkColors = ['#0c4a6e', '#78350f', '#14532d', '#3b0764', '#450a0a', '#1e1b4b'];
  const colors = isDark ? darkColors : lightColors;
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

export function getAvatarTextColor(name: string, isDark: boolean) {
  const lightColors = ['#0369a1', '#b45309', '#15803d', '#6b21a8', '#b91c1c', '#4338ca'];
  const darkColors = ['#7dd3fc', '#fcd34d', '#86efac', '#d8b4fe', '#fca5a5', '#a5b4fc'];
  const colors = isDark ? darkColors : lightColors;
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}
