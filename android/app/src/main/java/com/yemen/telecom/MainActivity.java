package com.yemen.telecom;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.yemen.telecom.biometricauth.BiometricAuthPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(BiometricAuthPlugin.class);
    }
}
