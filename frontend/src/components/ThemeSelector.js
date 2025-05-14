import React from 'react';
import { Button, Stack } from '@mui/material';
import { useColorMode } from '../App'; // adjust if needed

const themes = [
  { label: 'Soft Dark', name: 'softDark' },
  { label: 'Pure Black', name: 'black' },
  { label: 'Dark Blue', name: 'blue' },
  { label: 'Sepia', name: 'sepia' },
  { label: 'Light', name: 'light' }
];

export default function ThemeSelector() {
  const { setTheme, current } = useColorMode();

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
      {themes.map((t) => (
        <Button
          key={t.name}
          variant={t.name === current ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setTheme(t.name)}
        >
          {t.label}
        </Button>
      ))}
    </Stack>
  );
}
