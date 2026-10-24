// Start screen (kid pick, Easy), HUD (face goes green with stink, stink bar, poops left), phone layouts + Throw button
export const opts = [
  { label: "desktop" },
  { label: "phone landscape", w: 480, h: 300, touch: true },
  { label: "phone portrait", w: 390, h: 844, touch: true },
];

export default async (t, o) => {
  for (let i = 0; i < 40 && !(await t.eval("!!(window.__pr3d && __pr3d.state.ready)")); i++) await t.sleep(250);
  if (o.touch) {
    t.assert(await t.eval("document.getElementById('view').width") === 480, "phone canvas should be 480 wide");
    const off = await t.eval(`["pick-james", "pick-harry", "easy", "ov-btn"].filter(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return !(r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight);
    })`);
    t.assert(off.length === 0, "not fully on screen: " + off.join(", "));
    await t.boot();
    t.assert(!(await t.eval("document.getElementById('touch-ui').hidden")), "touch controls hidden");
    const r = await t.eval("(() => { const r = document.getElementById('fire-btn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()");
    await t.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r[0], y: r[1], id: 1 }] });
    await t.eval("__pr3d.tick(0.05)");
    await t.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    t.assert((await t.eval("__pr3d.state")).rolls === 29, "Throw button did not throw: rolls " + (await t.eval("__pr3d.state")).rolls);
    return;
  }

  await t.boot({ kid: "harry" });
  t.assert((await t.eval("__pr3d.state")).kid === "harry", "picked Harry but kid is " + (await t.eval("__pr3d.state")).kid);
  const face = () => t.eval(`(() => {
    const c = document.getElementById("hud-face"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0, gr = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { n++; gr += d[i + 1] - d[i]; }
    return { n, gr: gr / Math.max(1, n) };
  })()`);
  await t.sleep(100);
  const clean = await face();
  t.assert(clean.n > 1000, "HUD face is empty: " + clean.n);
  await t.eval("__pr3d.set({ stink: 80 })"); await t.sleep(150);
  const stinky = await face();
  t.assert(stinky.gr >= clean.gr + 25, `face not greener at 80% stink: ${clean.gr.toFixed(0)} -> ${stinky.gr.toFixed(0)}`);
  t.assert(await t.eval("document.querySelector('#hud-stink i').style.width") === "80%", "stink bar width wrong");
  t.assert(await t.eval("document.getElementById('hud-poops').textContent") === "18 left", "poops counter wrong");
  t.assert(await t.eval("localStorage.getItem('pr3d-kid')") === "harry", "kid pick not remembered");
};
