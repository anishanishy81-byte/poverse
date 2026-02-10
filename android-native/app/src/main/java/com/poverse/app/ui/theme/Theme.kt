package com.poverse.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Colors
val Primary = Color(0xFF1976D2)
val PrimaryDark = Color(0xFF1565C0)
val PrimaryLight = Color(0xFF42A5F5)
val Secondary = Color(0xFFFF6F00)
val SecondaryDark = Color(0xFFE65100)
val Background = Color(0xFFFAFAFA)
val Surface = Color(0xFFFFFFFF)
val Error = Color(0xFFD32F2F)
val Success = Color(0xFF388E3C)
val Warning = Color(0xFFF57C00)
val Info = Color(0xFF0288D1)
val OnPrimary = Color(0xFFFFFFFF)
val OnSecondary = Color(0xFFFFFFFF)
val OnBackground = Color(0xFF212121)
val OnSurface = Color(0xFF212121)
val TextSecondary = Color(0xFF757575)
val Divider = Color(0xFFBDBDBD)

// Dark colors
val DarkPrimary = Color(0xFF90CAF9)
val DarkSecondary = Color(0xFFFFB74D)
val DarkBackground = Color(0xFF121212)
val DarkSurface = Color(0xFF1E1E1E)
val DarkOnBackground = Color(0xFFE0E0E0)
val DarkOnSurface = Color(0xFFE0E0E0)

// Status colors
val CheckedInColor = Color(0xFF4CAF50)
val CheckedOutColor = Color(0xFFFF9800)
val AbsentColor = Color(0xFFF44336)
val OnTimeColor = Color(0xFF4CAF50)
val LateColor = Color(0xFFFF9800)
val VeryLateColor = Color(0xFFF44336)

// Lead status colors
val NewLeadColor = Color(0xFF2196F3)
val ContactedColor = Color(0xFF9C27B0)
val InterestedColor = Color(0xFF4CAF50)
val NotInterestedColor = Color(0xFFF44336)
val FollowUpColor = Color(0xFFFF9800)
val ConvertedColor = Color(0xFF00BCD4)
val LostColor = Color(0xFF795548)

// Priority colors
val LowPriorityColor = Color(0xFF9E9E9E)
val MediumPriorityColor = Color(0xFF2196F3)
val HighPriorityColor = Color(0xFFFF9800)
val UrgentPriorityColor = Color(0xFFF44336)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    primaryContainer = PrimaryLight,
    secondary = Secondary,
    onSecondary = OnSecondary,
    secondaryContainer = Color(0xFFFFE0B2),
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnSurface,
    error = Error,
    onError = Color.White,
    outline = Divider,
    surfaceVariant = Color(0xFFF5F5F5)
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = Color(0xFF003258),
    primaryContainer = Primary,
    secondary = DarkSecondary,
    onSecondary = Color(0xFF4E2600),
    secondaryContainer = SecondaryDark,
    background = DarkBackground,
    onBackground = DarkOnBackground,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    error = Color(0xFFCF6679),
    onError = Color.Black,
    outline = Color(0xFF424242),
    surfaceVariant = Color(0xFF2C2C2C)
)

@Composable
fun POVerseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = if (darkTheme) DarkSurface.toArgb() else Primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
