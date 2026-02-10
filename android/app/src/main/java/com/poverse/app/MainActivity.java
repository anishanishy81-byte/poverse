package com.poverse.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.poverse.app.plugins.NativeServicesPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before calling super
        registerPlugin(NativeServicesPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}

