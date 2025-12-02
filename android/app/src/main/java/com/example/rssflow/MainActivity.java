package com.example.rssflow;

import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge (this allows the webview to receive window insets)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
