// Preview-only storage adapter. Not included in the installable extension folder.
window.chrome = { storage: { local: {
  async get(keys) { const requested = keys || Object.keys(localStorage).filter(key => key.startsWith('cl-demo:')).map(key => key.slice(8)); return Object.fromEntries(requested.map(key => [key, JSON.parse(localStorage.getItem('cl-demo:' + key) || 'null')])); },
  async set(values) { for (const [key, value] of Object.entries(values)) localStorage.setItem('cl-demo:' + key, JSON.stringify(value)); }
} } };
const passages = [
  '雨停的时候，巷口那盏灯还亮着。沈知遥撑着伞站在石阶下，抬头看了许久，才发现门楣上的字已经换了。旧日的“听雨轩”不见了，如今只挂着一块素木牌，上面端端正正写着两个字：归来。',
  '她离开这座城，已经整整七年。七年足够让河岸边的柳树长高，也足够让一个人忘记许多事。可她依然记得，推开这扇门时，门轴会先响一声，然后才是悬在檐下的风铃。',
  '“站在外面做什么？”门里有人问。',
  '那声音很轻，隔着雨后的水汽，像一封迟迟没有拆开的信。知遥收起伞，指尖碰到伞骨时才发觉自己在发抖。她原本准备了许多话，关于这些年的去处，关于那场没能赴的约，关于一个始终没有寄出的回答。',
  '可到了这一刻，她只说：“路不太好找。”',
  '“或许是你走得太久了。”那人笑了一下，“进来吧，茶还热着。”',
  '屋里的陈设几乎没变。靠窗的长桌上摆着一方砚台，半卷书压在青瓷镇纸下面。炉火映在墙上，给那些沉默的旧物镀了一层柔软的金色。唯一不同的是，窗边多了一盆兰草，叶尖上还挂着细细的水珠。',
  '知遥在桌边坐下。茶盏推到面前，热气慢慢升起来，将对面那人的眉眼遮得有些模糊。她忽然想到，自己在外面走过那么多地方，见过大漠落日，也见过海上初雪，却没有哪一处，能让她像此刻这样，不必急着想下一站。',
  '“你怎么知道我会回来？”她问。',
  '对面的人没有立刻回答。他先把窗推开了一点，让檐下的雨水声落进屋里，然后才说：“不知道。只是这盏灯，总要有人点着。”',
  '街上渐渐有了人声。卖糖粥的老人敲着竹梆，从巷子的另一头慢慢走来。知遥捧着茶，听见那熟悉的节奏，忽然觉得七年并没有想象中那么长。长的是她一路上不肯回头的心事，而不是归途。',
  '她终于低下头，笑了。窗外，最后一滴雨从兰叶上滑落，落进泥土里。那封没有寄出的信，还好好地放在她衣襟深处。这一次，她想，她有足够的时间，把每一句话都慢慢说完。'
];
const continuation = [
  '第二天清晨，知遥被一阵细微的响动叫醒。有人在院子里扫落叶，竹帚擦过青石，沙沙作响。她睁开眼，看见天光穿过窗纸，在被角上落下一小片温暖的白。',
  '枕边放着一张地图。纸很旧，四角磨得发软，墨线却清晰得像是昨日才画上去的。她认得那座桥，也认得桥边的槐树；只是地图的空白处，不知何时多了一行小字：往东走，别着急。',
  '她把地图折好，下楼时，桌上的粥还冒着热气。昨夜的人坐在门边补伞，针线从指间穿过，动作很慢，也很稳。',
  '“今日要出门？”他没有抬头。',
  '“想去河边看看。”知遥顿了顿，“你要一起吗？”',
  '“或许可以。”他把最后一针缝好，将伞递给她，“先把早饭吃完。”',
  '河堤上已经有人放纸鸢。风从水面吹来，带着新草和湿泥的气息。她走在前面，时不时停下来辨认路边的店铺。七年前卖笔墨的地方，如今成了一间小小的花店，门口摆满了尚未开花的枝条。',
  '有些东西变了，有些东西却还在。桥栏上那道浅浅的刻痕，石阶间钻出来的野草，还有每逢风起便会摇晃的招牌，都像是替她保管过一段无人知晓的时光。',
  '“以前总觉得，这里太小。”她说。',
  '“现在呢？”',
  '知遥没有回答。她把手伸进衣襟，摸到了那封信。纸页被体温焐得温热，边角已经有些卷曲。她在心里默念过无数遍的开头，此刻终于不再像一道难以跨过的门槛。',
  '她在桥中央停下，将信递了过去。河水从桥下缓缓流过，带走一片不知从哪里落下的花瓣。春天还长，路也还长。她忽然不再急着知道，这个故事会怎样收尾。'
];
const titles = ['故人归来', '春水照归途'];
// Reproduce nested mirror-site panels and a native story scrollbar.
if (new URLSearchParams(location.search).has('layout_regression')) {
  const shell = document.createElement('section');
  shell.id = 'mirror-shell';
  const work = document.querySelector('#workskin');
  work.before(shell);
  for (const node of document.querySelectorAll('#main > .navigation, #main > .work.meta')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mirror-panel';
    wrapper.append(node); shell.append(wrapper);
  }
  shell.append(work);
  const style = document.createElement('style');
  style.textContent = '#workskin { overflow-x: auto; overflow-y: hidden; } .mirror-panel { background: #eee; border: 1px solid #aaa; }';
  document.head.append(style);
}
const full = new URLSearchParams(location.search).has('view_full_work');
const second = location.pathname.endsWith('/202');
const oneshot = location.pathname === '/works/102';
if (oneshot) document.querySelector('#workskin h2.title').textContent = '雨后的旧书店';
if (location.pathname === '/works/103') {
  document.querySelector('#workskin').remove();
  document.querySelector('#main').insertAdjacentHTML('beforeend', '<p>内容提示测试页：未展示正文时，不应出现阅读器。</p>');
} else {
  for (const i of full ? [0, 1] : [second ? 1 : 0]) {
    const section = document.createElement('div');
    if (!oneshot) { section.className = 'chapter'; section.id = `chapter-${i + 1}`; }
    section.innerHTML = `<div class="chapter preface group"><h3 class="title">第${i + 1 === 1 ? '一' : '二'}章 · ${titles[i]}</h3><div class="notes"><h3>作者的话</h3><div class="userstuff"><p>写给每一个在故事里停留片刻的人。愿你今晚读得安心。</p></div></div></div><div class="userstuff module" role="article"></div>`;
    (i ? continuation : passages).forEach(text => { const p = document.createElement('p'); p.textContent = text; section.querySelector('[role=article]').append(p); });
    document.querySelector('#chapters').append(section);
  }
  document.querySelector('#selected_id').value = second ? '202' : '201';
  if (full || oneshot) document.querySelector('.navigation').remove();
  else document.querySelector(second ? '.chapter.next' : '.chapter.previous').remove();
}
