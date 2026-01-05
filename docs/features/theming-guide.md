# Theming Guide for Ensemble

This guide covers the available theme options for the Ensemble app and how to customize them.

---

## How to Change Themes

Edit the CSS variables in `app/globals.css` under the `:root` and `.dark` selectors.

The app uses shadcn/ui's theming system which is based on HSL color values.

---

## Pre-configured Theme Options

### 1. Current Theme: Slate (Default)
Professional blue-gray with good contrast.

### 2. Zinc (Modern & Clean)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
}
```

### 3. Rose (Warm & Inviting)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 346.8 77.2% 49.8%;
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 346.8 77.2% 49.8%;
}
```

### 4. Violet (Creative & Bold)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 224 71.4% 4.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 224 71.4% 4.1%;
  --primary: 262.1 83.3% 57.8%;
  --primary-foreground: 210 20% 98%;
  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220.9 39.3% 11%;
  --muted: 220 14.3% 95.9%;
  --muted-foreground: 220 8.9% 46.1%;
  --accent: 220 14.3% 95.9%;
  --accent-foreground: 220.9 39.3% 11%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 262.1 83.3% 57.8%;
}
```

### 5. Green (Fresh & Natural)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 142.1 76.2% 36.3%;
}
```

### 6. Orange (Energetic & Warm)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 20 14.3% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 20 14.3% 4.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 20 14.3% 4.1%;
  --primary: 24.6 95% 53.1%;
  --primary-foreground: 60 9.1% 97.8%;
  --secondary: 60 4.8% 95.9%;
  --secondary-foreground: 24 9.8% 10%;
  --muted: 60 4.8% 95.9%;
  --muted-foreground: 25 5.3% 44.7%;
  --accent: 60 4.8% 95.9%;
  --accent-foreground: 24 9.8% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 20 5.9% 90%;
  --input: 20 5.9% 90%;
  --ring: 24.6 95% 53.1%;
}
```

### 7. Blue (Professional & Trustworthy)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

---

## Interactive Theme Picker

Visit https://ui.shadcn.com/themes to see all themes visually and copy the CSS.

---

## To Apply a Theme:

1. Copy the CSS variables for your chosen theme from above
2. Replace the `:root` section in `app/globals.css`
3. Optionally update the `.dark` section for dark mode
4. Save and refresh - changes apply instantly!

---

## Custom Themes

You can also create your own by:
1. Picking a primary color
2. Using a tool like https://ui.shadcn.com/themes
3. Or manually adjusting the HSL values

---

## Radius Options

You can also change the border radius in `tailwind.config.ts`:

```typescript
--radius: 0rem;    // Sharp corners
--radius: 0.3rem;  // Subtle rounded
--radius: 0.5rem;  // Default
--radius: 0.75rem; // More rounded
--radius: 1rem;    // Very rounded
```

---

## Theme-Specific Customizations

### Dark Mode
The app supports dark mode. Update the `.dark` selector in `app/globals.css` to customize dark theme colors.

### Color Tokens

The app uses semantic color tokens:
- **background**: Main background color
- **foreground**: Main text color
- **primary**: Primary action color (buttons, links)
- **secondary**: Secondary elements
- **muted**: Subtle backgrounds and text
- **accent**: Highlighted elements
- **destructive**: Danger/delete actions
- **border**: Border colors
- **input**: Form input borders
- **ring**: Focus rings

---

## Tips

1. **Test in Both Modes**: Always test your theme in both light and dark mode
2. **Accessibility**: Ensure sufficient contrast between foreground and background colors
3. **Consistency**: Use the semantic tokens consistently throughout your custom components
4. **Preview**: Use the shadcn theme builder to preview changes before applying

---

**Related Documentation:**
- shadcn/ui documentation: https://ui.shadcn.com
- Tailwind CSS colors: https://tailwindcss.com/docs/customizing-colors

