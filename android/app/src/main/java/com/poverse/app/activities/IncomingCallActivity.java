package com.poverse.app.activities;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.poverse.app.MainActivity;
import com.poverse.app.R;
import com.poverse.app.services.CallNotificationService;

/**
 * Full-screen activity for incoming calls
 * Shows even when device is locked
 */
public class IncomingCallActivity extends AppCompatActivity {
    private static final String TAG = "IncomingCallActivity";
    
    private String callId;
    private String callerId;
    private String callerName;
    private String callType;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Make activity show over lock screen
        setupLockScreenBehavior();
        
        // Get call data from intent
        Intent intent = getIntent();
        callId = intent.getStringExtra(CallNotificationService.EXTRA_CALL_ID);
        callerId = intent.getStringExtra(CallNotificationService.EXTRA_CALLER_ID);
        callerName = intent.getStringExtra(CallNotificationService.EXTRA_CALLER_NAME);
        callType = intent.getStringExtra(CallNotificationService.EXTRA_CALL_TYPE);
        
        // Set up the UI programmatically (no XML layout needed)
        setupUI();
    }
    
    private void setupLockScreenBehavior() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
        
        // Fullscreen
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
    }
    
    private void setupUI() {
        // Create a simple programmatic layout
        android.widget.LinearLayout mainLayout = new android.widget.LinearLayout(this);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setGravity(android.view.Gravity.CENTER);
        mainLayout.setBackgroundColor(0xFF1a1a2e); // Dark blue background
        mainLayout.setPadding(48, 48, 48, 48);
        
        // Call type label
        TextView callTypeLabel = new TextView(this);
        callTypeLabel.setText("video".equals(callType) ? "Incoming Video Call" : "Incoming Voice Call");
        callTypeLabel.setTextColor(0xCCFFFFFF);
        callTypeLabel.setTextSize(16);
        callTypeLabel.setGravity(android.view.Gravity.CENTER);
        android.widget.LinearLayout.LayoutParams labelParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = 48;
        mainLayout.addView(callTypeLabel, labelParams);
        
        // Avatar circle
        View avatarCircle = new View(this);
        android.graphics.drawable.GradientDrawable avatarDrawable = new android.graphics.drawable.GradientDrawable();
        avatarDrawable.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        avatarDrawable.setColor(0xFF0095f6);
        avatarCircle.setBackground(avatarDrawable);
        android.widget.LinearLayout.LayoutParams avatarParams = new android.widget.LinearLayout.LayoutParams(200, 200);
        avatarParams.gravity = android.view.Gravity.CENTER;
        avatarParams.bottomMargin = 32;
        mainLayout.addView(avatarCircle, avatarParams);
        
        // Caller name
        TextView callerNameView = new TextView(this);
        callerNameView.setText(callerName != null ? callerName : "Unknown");
        callerNameView.setTextColor(0xFFFFFFFF);
        callerNameView.setTextSize(28);
        callerNameView.setTypeface(null, android.graphics.Typeface.BOLD);
        callerNameView.setGravity(android.view.Gravity.CENTER);
        android.widget.LinearLayout.LayoutParams nameParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        nameParams.bottomMargin = 16;
        mainLayout.addView(callerNameView, nameParams);
        
        // PO-VERSE label
        TextView appLabel = new TextView(this);
        appLabel.setText("PO-VERSE Call");
        appLabel.setTextColor(0x99FFFFFF);
        appLabel.setTextSize(14);
        appLabel.setGravity(android.view.Gravity.CENTER);
        android.widget.LinearLayout.LayoutParams appLabelParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        appLabelParams.bottomMargin = 96;
        mainLayout.addView(appLabel, appLabelParams);
        
        // Buttons container
        android.widget.LinearLayout buttonsLayout = new android.widget.LinearLayout(this);
        buttonsLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        buttonsLayout.setGravity(android.view.Gravity.CENTER);
        
        // Decline button
        android.widget.LinearLayout declineContainer = new android.widget.LinearLayout(this);
        declineContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        declineContainer.setGravity(android.view.Gravity.CENTER);
        
        android.widget.Button declineButton = new android.widget.Button(this);
        android.graphics.drawable.GradientDrawable declineBg = new android.graphics.drawable.GradientDrawable();
        declineBg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        declineBg.setColor(0xFFef4444);
        declineButton.setBackground(declineBg);
        declineButton.setText("✕");
        declineButton.setTextColor(0xFFFFFFFF);
        declineButton.setTextSize(24);
        android.widget.LinearLayout.LayoutParams declineBtnParams = new android.widget.LinearLayout.LayoutParams(160, 160);
        declineButton.setLayoutParams(declineBtnParams);
        declineButton.setOnClickListener(v -> declineCall());
        declineContainer.addView(declineButton);
        
        TextView declineLabel = new TextView(this);
        declineLabel.setText("Decline");
        declineLabel.setTextColor(0xFFFFFFFF);
        declineLabel.setTextSize(12);
        declineLabel.setGravity(android.view.Gravity.CENTER);
        android.widget.LinearLayout.LayoutParams declineLabelParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        declineLabelParams.topMargin = 16;
        declineContainer.addView(declineLabel, declineLabelParams);
        
        android.widget.LinearLayout.LayoutParams declineContainerParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        declineContainerParams.rightMargin = 96;
        buttonsLayout.addView(declineContainer, declineContainerParams);
        
        // Accept button
        android.widget.LinearLayout acceptContainer = new android.widget.LinearLayout(this);
        acceptContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        acceptContainer.setGravity(android.view.Gravity.CENTER);
        
        android.widget.Button acceptButton = new android.widget.Button(this);
        android.graphics.drawable.GradientDrawable acceptBg = new android.graphics.drawable.GradientDrawable();
        acceptBg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        acceptBg.setColor(0xFF22c55e);
        acceptButton.setBackground(acceptBg);
        acceptButton.setText("✓");
        acceptButton.setTextColor(0xFFFFFFFF);
        acceptButton.setTextSize(24);
        android.widget.LinearLayout.LayoutParams acceptBtnParams = new android.widget.LinearLayout.LayoutParams(160, 160);
        acceptButton.setLayoutParams(acceptBtnParams);
        acceptButton.setOnClickListener(v -> acceptCall());
        acceptContainer.addView(acceptButton);
        
        TextView acceptLabel = new TextView(this);
        acceptLabel.setText("Accept");
        acceptLabel.setTextColor(0xFFFFFFFF);
        acceptLabel.setTextSize(12);
        acceptLabel.setGravity(android.view.Gravity.CENTER);
        android.widget.LinearLayout.LayoutParams acceptLabelParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        acceptLabelParams.topMargin = 16;
        acceptContainer.addView(acceptLabel, acceptLabelParams);
        
        buttonsLayout.addView(acceptContainer);
        
        mainLayout.addView(buttonsLayout);
        
        setContentView(mainLayout);
    }
    
    private void acceptCall() {
        // Start call service with accept action
        Intent serviceIntent = new Intent(this, CallNotificationService.class);
        serviceIntent.setAction(CallNotificationService.ACTION_ACCEPT_CALL);
        startService(serviceIntent);
        
        // Open main activity with call data
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("action", "acceptCall");
        mainIntent.putExtra(CallNotificationService.EXTRA_CALL_ID, callId);
        mainIntent.putExtra(CallNotificationService.EXTRA_CALLER_ID, callerId);
        mainIntent.putExtra(CallNotificationService.EXTRA_CALLER_NAME, callerName);
        mainIntent.putExtra(CallNotificationService.EXTRA_CALL_TYPE, callType);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(mainIntent);
        
        finish();
    }
    
    private void declineCall() {
        // Start call service with decline action
        Intent serviceIntent = new Intent(this, CallNotificationService.class);
        serviceIntent.setAction(CallNotificationService.ACTION_DECLINE_CALL);
        startService(serviceIntent);
        
        finish();
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button from dismissing the call screen
        // User must accept or decline
    }
}
