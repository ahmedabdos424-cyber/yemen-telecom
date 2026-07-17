package com.yemen.telecom;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.yemen.telecom.appupdater.AppUpdaterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(AppUpdaterPlugin.class);
    }
}
