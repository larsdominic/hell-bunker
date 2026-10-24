// The 2D Poop Runner intro: hit = splat and the poop comes again; jump it = morph into the 3D park; Skip; no intro on Try again
export const opts = [{ label: "desktop" }, { label: "phone landscape", w: 480, h: 300, touch: true }];

export default async (t, o) => {
  for (let i = 0; i < 40 && !(await t.eval("!!(window.__pr3d && __pr3d.state.ready)")); i++) await t.sleep(250);
  const st = () => t.eval("__pr3d.state");
  const waitFor = async (expr, ms, msg) => {
    for (let i = 0; i < ms / 50; i++) { if (await t.eval(expr)) return; await t.sleep(50); }
    throw new Error(msg);
  };
  t.assert((await st()).phase === "title", "should start on the title screen");
  await t.eval("document.getElementById('ov-btn').click()");
  t.assert((await st()).phase === "intro", "Start did not open the 2D intro");
  t.assert(!(await t.eval("document.getElementById('intro').hidden")), "intro layer hidden");
  const fill = await t.eval(`(() => { const a = document.getElementById('intro').getBoundingClientRect(), b = document.getElementById('stage').getBoundingClientRect();
    return Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2; })()`);
  t.assert(fill, "intro does not fill the game frame");

  // No jump: the poop hits, splat, still in the intro, and the poop comes back
  await waitFor("document.querySelector('#intro .kid-wrapper').classList.contains('crying')", 8000, "poop never hit the kid");
  t.assert((await st()).phase === "intro", "a hit left the intro");
  await waitFor("!document.querySelector('#intro .kid-wrapper').classList.contains('crying') && __pr3d.state.introGap > 100", 4000, "poop did not come back after the splat");

  // Jump as it arrives: morph, then 3D play
  await waitFor("__pr3d.state.introGap < 70", 8000, "poop never came close");
  if (o.touch) await t.tap(40, 60); else await t.eval("__pr3d.introJump()");
  await waitFor("__pr3d.state.phase === 'morph'", 1500, "clearing the poop did not start the morph");
  await waitFor("__pr3d.state.phase === 'play'", 3000, "morph did not finish within 3 s");
  let s = await st();
  t.assert(await t.eval("document.getElementById('intro').hidden"), "intro layer still showing");
  t.assert(s.running && s.poopsLeft === 18, `after morph: running ${s.running}, poopsLeft ${s.poopsLeft}`);
  const near = await t.eval(`__pr3d.find('small').filter(p => Math.hypot(p.x - __pr3d.state.px, p.y - __pr3d.state.py) < 4.5).length`);
  t.assert(near === 1, "the jumped poop is not waiting in front of you");

  // Lose, then Try again goes straight to 3D
  await t.eval("__pr3d.hold(true), __pr3d.set({ stink: 99 }), __pr3d.place('small', __pr3d.state.px, __pr3d.state.py - 0.6, { awake: true }), __pr3d.tick(0.3)");
  t.assert((await st()).over === "lose", "did not lose");
  await t.eval("document.getElementById('ov-btn').click()");
  t.assert((await st()).phase === "play", "Try again showed the intro");

  // Pause -> ... and a fresh Start from a won game shows the intro again, which Skip skips
  await t.eval("__pr3d.clear('poops'), __pr3d.tick(0.1), __pr3d.clear('king'), __pr3d.set({ win: true })");
  t.assert((await st()).over === "win", "could not reach the win screen");
  await t.eval("document.getElementById('ov-btn').click()");
  t.assert((await st()).phase === "intro", "Play again after a win should show the intro");
  await t.eval("document.getElementById('skip-intro').click()");
  s = await st();
  t.assert(s.phase === "play" && s.running && s.poopsLeft === 18, "Skip did not start the 3D game");
};
