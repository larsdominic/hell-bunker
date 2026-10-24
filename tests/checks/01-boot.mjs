// The page loads offline, is called Pooprunner 3D, starts, and the test hook can step it
export default async t => {
  t.assert(await t.eval("document.title") === "Pooprunner 3D", "title is not Pooprunner 3D");
  await t.boot();
  t.assert(await t.eval("__pr3d.state.running") === true, "game not running after start");
  const ext = await t.eval(`performance.getEntriesByType("resource").map(e => e.name).filter(n => !/^(data|file|blob):/.test(n))`);
  t.assert(ext.length === 0, "network requests: " + ext.join(", "));
  t.assert(await t.eval("__pr3d.tick(1), __pr3d.state.running") === true, "tick(1) stopped the game");
  const p = await t.eval("__pr3d.pixel(320, 300)");
  t.assert(Array.isArray(p) && p.length === 3, "pixel() did not return [r,g,b]");
  const l = await t.eval("__pr3d.light(5.5, 5.5)");
  t.assert(Array.isArray(l) && l.length === 3, "light() did not return [r,g,b]");
};
