package io.github.chapterlight.reader;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.graphics.PathParser;

/** Shared native typography, touch targets and a restrained glass treatment. */
final class ReaderUi {
    static final int INK = Color.rgb(29, 48, 45), MUTED = Color.rgb(85, 106, 101);
    static final int ACCENT = Color.rgb(33, 103, 85), PAPER = Color.rgb(246, 248, 245);
    final Context context;
    boolean dark;
    int ink() { return dark ? 0xFFDBE4DC : INK; }
    int muted() { return dark ? 0xFFB2C0B6 : MUTED; }
    int paper() { return dark ? 0xFF202723 : PAPER; }
    int card() { return dark ? 0xFF29342E : Color.WHITE; }
    int selected() { return dark ? 0xFF3D5749 : 0xFFDDEAE2; }
    ReaderUi(Context context) { this.context = context; }
    int dp(int n) { return Math.round(n * context.getResources().getDisplayMetrics().density); }
    TextView text(String value, int size, boolean bold) {
        TextView view = new TextView(context); view.setText(value); view.setTextSize(size);
        view.setTextColor(ink()); view.setFontFeatureSettings("kern");
        if (bold) view.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        return view;
    }
    LinearLayout column() { LinearLayout view = new LinearLayout(context); view.setOrientation(LinearLayout.VERTICAL); return view; }
    LinearLayout row() { LinearLayout view = new LinearLayout(context); view.setGravity(Gravity.CENTER_VERTICAL); return view; }
    GradientDrawable surface(int color, int radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
    }
    GradientDrawable glass() {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                dark ? new int[]{0xFA394A40,0xF02A372F,0xF937493F} : new int[]{0xFAFFFFFF, 0xF0EDF4EF, 0xF9FFFFFF});
        d.setCornerRadius(dp(32)); d.setStroke(dp(1), dark ? 0xFF526258 : Color.WHITE); return d;
    }
    TextView button(String text, String icon, Runnable click) {
        TextView view = text(text, 15, true); view.setGravity(Gravity.CENTER);
        view.setMinHeight(dp(48)); view.setPadding(dp(14), dp(10), dp(14), dp(10));
        view.setBackground(new RippleDrawable(ColorStateList.valueOf(0x20326352), surface(0x00FFFFFF, 24), surface(Color.WHITE,24)));
        if (icon != null) { Drawable d = icon(icon); d.setBounds(0,0,dp(22),dp(22)); view.setCompoundDrawables(d,null,null,null); view.setCompoundDrawablePadding(dp(9)); }
        view.setOnClickListener(v -> click.run()); return view;
    }
    TextView iconButton(String label, String name, Runnable click) {
        TextView view = button("", null, click); view.setContentDescription(label);
        view.setPadding(dp(13),dp(13),dp(13),dp(13));
        Drawable d = icon(name); d.setBounds(0,0,dp(22),dp(22)); view.setCompoundDrawables(d,null,null,null);
        view.setLayoutParams(new LinearLayout.LayoutParams(dp(48),dp(48))); return view;
    }
    Drawable icon(String name) {
        String data;
        switch(name) {
            case "back": data="M15 5L8 12L15 19"; break;
            case "next": data="M9 5L16 12L9 19"; break;
            case "search": data="M20 20L15.5 15.5M17 10A7 7 0 1 1 3 10A7 7 0 1 1 17 10"; break;
            case "bookmark": data="M6 4L18 4L18 21L12 17L6 21Z"; break;
            case "library": data="M4 4L8 4L8 20L4 20ZM11 4L11 20M15 5L19 4L22 19L18 20Z"; break;
            case "discover": data="M21 12A9 9 0 1 1 3 12A9 9 0 1 1 21 12M15 9L13 13L9 15L11 11Z"; break;
            case "profile": data="M16 7A4 4 0 1 1 8 7A4 4 0 1 1 16 7M4 21C4 12 20 12 20 21"; break;
            case "contents": data="M4 6L5 6M9 6L20 6M4 12L5 12M9 12L20 12M4 18L5 18M9 18L20 18"; break;
            case "type": data="M3 19L9 5L15 19M5 14L13 14M15 9L23 9M19 9L19 19"; break;
            case "close": data="M6 6L18 18M18 6L6 18"; break;
            case "check": data="M5 12L10 17L20 7"; break;
            default: data="M12 5L12 6M12 11L12 12M12 17L12 18";
        }
        final Path path = PathParser.createPathFromPathData(data);
        return new Drawable() {
            final Paint paint = new Paint(3);
            @Override public void draw(Canvas c) {
                c.save(); c.translate(getBounds().left,getBounds().top); c.scale(getBounds().width()/24f,getBounds().height()/24f);
                paint.setColor(ink()); paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.7f); paint.setStrokeCap(Paint.Cap.ROUND); paint.setStrokeJoin(Paint.Join.ROUND);
                c.drawPath(path,paint); c.restore();
            }
            @Override public void setAlpha(int alpha) { paint.setAlpha(alpha); }
            @Override public void setColorFilter(android.graphics.ColorFilter filter) { paint.setColorFilter(filter); }
            @Override public int getOpacity() { return android.graphics.PixelFormat.TRANSLUCENT; }
        };
    }
}
