package kr.mongle.todo;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class WidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    static class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private final List<JSONObject> items = new ArrayList<>();

        Factory(Context ctx) { this.ctx = ctx; }

        @Override public void onCreate() { }

        @Override
        public void onDataSetChanged() {
            items.clear();
            JSONObject data = MongleWidget.readData(ctx);
            if (!MongleWidget.isToday(data)) return;
            JSONArray arr = data.optJSONArray("items");
            if (arr == null) return;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null) items.add(o);
            }
        }

        @Override public void onDestroy() { items.clear(); }
        @Override public int getCount() { return items.size(); }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_item);
            if (position >= items.size()) return rv;
            JSONObject it = items.get(position);
            boolean done = it.optBoolean("done");
            int color;
            try { color = Color.parseColor(it.optString("color", "#B49A86")); } catch (Exception e) { color = Color.GRAY; }
            rv.setImageViewResource(R.id.dot, done ? R.drawable.dot_solid : R.drawable.dot_ring);
            rv.setInt(R.id.dot, "setColorFilter", color);
            rv.setViewVisibility(R.id.tick, done ? View.VISIBLE : View.GONE);
            String text = it.optString("text", "");
            if (done) {
                SpannableString s = new SpannableString(text);
                s.setSpan(new StrikethroughSpan(), 0, text.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                rv.setTextViewText(R.id.text, s);
                rv.setTextColor(R.id.text, Color.parseColor("#A79FB8"));
            } else {
                rv.setTextViewText(R.id.text, text);
                rv.setTextColor(R.id.text, Color.parseColor("#2F2742"));
            }
            String time = it.optString("time", "");
            rv.setTextViewText(R.id.time, time);
            rv.setViewVisibility(R.id.time, time.isEmpty() || done ? View.GONE : View.VISIBLE);
            Intent fill = new Intent();
            fill.putExtra(MongleWidget.EXTRA_ID, it.optString("id"));
            rv.setOnClickFillInIntent(R.id.item_root, fill);
            return rv;
        }

        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int position) { return position; }
        @Override public boolean hasStableIds() { return false; }
    }
}
