package kr.mongle.todo;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MongleWidget extends AppWidgetProvider {
    static final String PREFS = "CapacitorStorage";
    static final String ACTION_TOGGLE = "kr.mongle.todo.WIDGET_TOGGLE";
    static final String EXTRA_ID = "todo_id";

    static JSONObject readData(Context ctx) {
        try {
            String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("widget_data", null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    static boolean isToday(JSONObject data) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        return data != null && today.equals(data.optString("date"));
    }

    static int immutable() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, MongleWidget.class));
        if (ids == null || ids.length == 0) return;
        for (int id : ids) update(ctx, mgr, id);
        mgr.notifyAppWidgetViewDataChanged(ids, R.id.list);
    }

    static void update(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget);
        JSONObject data = readData(ctx);
        boolean fresh = isToday(data);

        String title = new SimpleDateFormat("M/d", Locale.KOREA).format(new Date());
        rv.setTextViewText(R.id.title, "오늘 · " + title);
        if (fresh) {
            int left = data.optInt("left", 0);
            rv.setTextViewText(R.id.left, left > 0 ? "남은 할 일 " + left + "개" : "모두 끝냈어요");
            String dday = data.optString("dday", "");
            rv.setTextViewText(R.id.dday, dday);
            rv.setViewVisibility(R.id.dday, dday.isEmpty() ? View.GONE : View.VISIBLE);
            rv.setTextViewText(R.id.habits, "오늘의 습관 " + data.optString("habits", "0/0"));
            try {
                int accent = Color.parseColor(data.optString("accent", "#8B6FE8"));
                rv.setTextColor(R.id.dday, accent);
            } catch (Exception ignored) { }
        } else {
            rv.setTextViewText(R.id.left, "앱을 열면 오늘 할 일이 보여요");
            rv.setViewVisibility(R.id.dday, View.GONE);
            rv.setTextViewText(R.id.habits, "");
        }

        Intent svc = new Intent(ctx, WidgetService.class);
        svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
        rv.setRemoteAdapter(R.id.list, svc);
        rv.setEmptyView(R.id.list, R.id.empty);

        Intent toggle = new Intent(ctx, MongleWidget.class);
        toggle.setAction(ACTION_TOGGLE);
        int mutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
        rv.setPendingIntentTemplate(R.id.list, PendingIntent.getBroadcast(ctx, 1, toggle, PendingIntent.FLAG_UPDATE_CURRENT | mutable));

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(ctx, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
        rv.setOnClickPendingIntent(R.id.header, openPi);
        rv.setOnClickPendingIntent(R.id.empty, openPi);
        rv.setOnClickPendingIntent(R.id.habits, openPi);

        mgr.updateAppWidget(widgetId, rv);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
        mgr.notifyAppWidgetViewDataChanged(ids, R.id.list);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (!ACTION_TOGGLE.equals(intent.getAction())) return;
        String id = intent.getStringExtra(EXTRA_ID);
        if (id == null) return;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONObject data = readData(ctx);
            if (data == null) return;
            JSONArray items = data.optJSONArray("items");
            int left = 0;
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject it = items.getJSONObject(i);
                    if (id.equals(it.optString("id"))) it.put("done", !it.optBoolean("done"));
                    if (!it.optBoolean("done")) left++;
                }
            }
            data.put("left", left);
            JSONArray pending;
            try { pending = new JSONArray(prefs.getString("widget_pending", "[]")); } catch (Exception e) { pending = new JSONArray(); }
            pending.put(id);
            prefs.edit().putString("widget_data", data.toString()).putString("widget_pending", pending.toString()).apply();
        } catch (Exception ignored) { }
        refreshAll(ctx);
    }
}
