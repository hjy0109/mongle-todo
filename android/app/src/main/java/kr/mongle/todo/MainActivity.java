package kr.mongle.todo;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        createChannels();
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel quiet = new NotificationChannel("popup_quiet", "팝업 알림 (무음)", NotificationManager.IMPORTANCE_HIGH);
        quiet.setDescription("소리와 진동 없이 화면 위에 잠깐 뜨는 알림");
        quiet.setSound(null, null);
        quiet.enableVibration(false);
        nm.createNotificationChannel(quiet);
        NotificationChannel sound = new NotificationChannel("popup_sound", "팝업 알림 (소리)", NotificationManager.IMPORTANCE_HIGH);
        sound.setDescription("소리와 함께 화면 위에 잠깐 뜨는 알림");
        nm.createNotificationChannel(sound);
    }
}
