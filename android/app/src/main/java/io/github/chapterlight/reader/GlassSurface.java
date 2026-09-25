package io.github.chapterlight.reader;

import android.content.Context;
import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.RenderEffect;
import android.graphics.RenderNode;
import android.graphics.Shader;
import android.os.Build;
import android.widget.LinearLayout;
import android.view.View;
import androidx.annotation.RequiresApi;
import java.util.function.BooleanSupplier;

/** Samples the content layer only, so glass and its labels are never recursively blurred. */
@SuppressLint("ViewConstructor") // Created in code with an explicit backdrop source, never inflated.
final class GlassSurface extends LinearLayout {
    private final View content;
    private final BooleanSupplier dark;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path clip = new Path();
    private final RectF bounds = new RectF();
    private final int[] here = new int[2], there = new int[2];
    private final float density;
    private GpuBackdrop backdrop;
    private LinearGradient tint, edge;
    private boolean gradientNight;

    private void updateGradients() {
        gradientNight=dark.getAsBoolean();
        tint=new LinearGradient(0,0,Math.max(1,getWidth()),Math.max(1,getHeight()),
                gradientNight?new int[]{0xA043554B,0xBA203329,0x993E5146}:new int[]{0xACFFFFFF,0x609FD0B8,0x9CFFFFFF},null,Shader.TileMode.CLAMP);
        edge=new LinearGradient(0,0,Math.max(1,getWidth()/2f),Math.max(1,getHeight()),new int[]{gradientNight?0xAA9DB8A8:0xF9FFFFFF,gradientNight?0x284F6C5B:0x32678779,gradientNight?0x668CA898:0xBEFFFFFF},null,Shader.TileMode.CLAMP);
    }
    @Override protected void onSizeChanged(int w,int h,int oldw,int oldh) { super.onSizeChanged(w,h,oldw,oldh);updateGradients(); }

    GlassSurface(Context context, View content, BooleanSupplier dark) {
        super(context); this.content=content; this.dark=dark;
        density=getResources().getDisplayMetrics().density;
        setWillNotDraw(false); setElevation(6*density);
        android.graphics.drawable.GradientDrawable outline=new android.graphics.drawable.GradientDrawable();
        outline.setColor(Color.TRANSPARENT); outline.setCornerRadius(30*density); setBackground(outline);
        setClipToOutline(true);
        if(Build.VERSION.SDK_INT>=31) backdrop=new GpuBackdrop(18*density);
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        bounds.set(0,0,getWidth(),getHeight()); clip.reset(); clip.addRoundRect(bounds,30*density,30*density,Path.Direction.CW);
        canvas.save(); canvas.clipPath(clip);
        boolean useBlur=Build.VERSION.SDK_INT>=31 && canvas.isHardwareAccelerated() && content.getWidth()>0;
        canvas.drawColor(dark.getAsBoolean()?0xFF26352E:0xFFF6F8F5);
        if(useBlur) {
            getLocationOnScreen(here); content.getLocationOnScreen(there);
            backdrop.draw(canvas,content,getWidth(),getHeight(),there[0]-here[0],there[1]-here[1]);
        }
        if(tint==null || gradientNight!=dark.getAsBoolean()) updateGradients();
        paint.setShader(tint);
        paint.setStyle(Paint.Style.FILL); canvas.drawRoundRect(bounds,30*density,30*density,paint);
        paint.setShader(edge);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.2f*density);
        bounds.inset(.65f*density,.65f*density); canvas.drawRoundRect(bounds,29*density,29*density,paint);
        paint.setShader(null); canvas.restore();
    }
    @RequiresApi(31)
    private static final class GpuBackdrop {
        private final RenderNode node=new RenderNode("Chapterlight backdrop");
        private final int pad;
        private Bitmap snapshot;
        private Canvas capture;
        private final Paint bitmapPaint=new Paint(Paint.FILTER_BITMAP_FLAG);
        GpuBackdrop(float radius) {
            pad=(int)Math.ceil(radius*2);
            node.setRenderEffect(RenderEffect.createBlurEffect(radius,radius,Shader.TileMode.CLAMP));
        }
        void draw(Canvas destination,View content,int width,int height,int x,int y) {
            int w=(width+pad*2+1)/2,h=(height+pad*2+1)/2;
            if(snapshot==null || snapshot.getWidth()!=w || snapshot.getHeight()!=h) {
                if(snapshot!=null) snapshot.recycle();
                snapshot=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);capture=new Canvas(snapshot);
            }
            snapshot.eraseColor(Color.TRANSPARENT);
            capture.save();capture.scale(.5f,.5f);
            capture.translate(x+pad-content.getScrollX(),y+pad-content.getScrollY());
            // A software snapshot avoids reparenting Chromium's hardware display list.
            content.draw(capture);capture.restore();
            node.setPosition(-pad,-pad,width+pad,height+pad);
            Canvas recorded=node.beginRecording(width+pad*2,height+pad*2);
            recorded.scale(2,2);recorded.drawBitmap(snapshot,0,0,bitmapPaint);node.endRecording();
            destination.drawRenderNode(node);
        }
    }
}
