import React from 'react';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '../App'; // adjust path if needed

export default function DarkModeToggle() {
  const theme = useTheme();
  const { current, setTheme } = useColorMode();

  const isDark = theme.palette.mode === 'dark';

  const toggleMode = () => {
    if (current === 'light') setTheme('softDark');
    else setTheme('light');
  };

  return (
    <IconButton onClick={toggleMode} color="inherit" style={{ float: 'right' }}>
      {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}
