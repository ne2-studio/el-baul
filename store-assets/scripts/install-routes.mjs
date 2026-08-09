// Wires fixtures.mjs's data into a Playwright page via network interception. Only the
// specific GET endpoints screenshots depend on are faked; everything else (auth token
// exchange, /api/users/me, POSTs) passes through to the real api-lite so login keeps working
// normally — see capture-screenshots.mjs for why route interception is used instead of
// seeding a real backend.
function json(route, body) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function installFixtureRoutes(page, fixtures, apiBase) {
  const { data, photosByChapter } = fixtures;

  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') return route.continue();

    const url = new URL(request.url());
    if (url.origin !== apiBase) return route.continue();
    const p = url.pathname;
    const m = (re) => p.match(re);

    if (p === '/api/app-config') return json(route, data.appConfig);
    if (p === '/api/baules') return json(route, data.baules);
    if (m(/^\/api\/baules\/[^/]+$/)) return json(route, data.baul);
    if (m(/^\/api\/baules\/[^/]+\/chapters$/)) return json(route, data.chapters);
    if (m(/^\/api\/baules\/[^/]+\/recuerdos$/)) return json(route, data.recuerdos);
    if (m(/^\/api\/baules\/[^/]+\/feed$/)) return json(route, data.feed);
    if (m(/^\/api\/baules\/[^/]+\/personas$/)) return json(route, data.personas);
    // Custodio baúles trigger a background removal-requests load right after chapters —
    // this fixture baúl doesn't exist in api-lite's real store, so leaving this unmocked
    // 404s and fails the whole loadChapters() chain (chapters + personas + this, all-or-nothing).
    if (m(/^\/api\/baules\/[^/]+\/removal-requests$/)) return json(route, []);
    if (m(/^\/api\/baules\/[^/]+\/personas\/([^/]+)\/photos$/)) {
      const personaId = RegExp.$1;
      const persona = data.personas.find((p2) => p2.id === personaId);
      const allPhotos = Object.values(photosByChapter).flat();
      // No real tagging fixture data — just show a plausible-looking handful so the persona's
      // "Fotos" tab isn't empty, biased toward that persona's own chapter if they uploaded one.
      const subset = allPhotos.filter((ph) => ph.uploadedBy === personaId);
      return json(route, subset.length ? subset : allPhotos.slice(0, 4));
    }
    if (m(/^\/api\/baules\/[^/]+\/photos\/sueltas$/)) return json(route, data.loosePhotos);
    if (m(/^\/api\/baules\/[^/]+\/photos\/untagged-suggestion$/)) return json(route, null);
    if (m(/^\/api\/baules\/[^/]+\/photos$/)) {
      const chapterId = url.searchParams.get('chapterId');
      const items = chapterId ? (photosByChapter[chapterId] || []) : Object.values(photosByChapter).flat();
      return json(route, { items, hasMore: false });
    }
    if (m(/^\/api\/chapters\/([^/]+)\/photos$/)) {
      const chapterId = RegExp.$1;
      return json(route, photosByChapter[chapterId] || []);
    }
    if (m(/^\/api\/baules\/[^/]+\/chapters\/([^/]+)\/recuerdos$/)) {
      const chapterId = RegExp.$1;
      return json(route, data.recuerdos.filter((r) => r.chapterId === chapterId));
    }
    if (m(/^\/api\/baules\/[^/]+\/invite-link$/)) return json(route, data.inviteLink);
    if (m(/^\/api\/baul-invites\/[^/]+\/preview$/)) return json(route, data.invitePreview);
    if (m(/^\/api\/baules\/[^/]+\/chat\/suggestions$/)) return json(route, []);
    if (m(/^\/api\/baules\/[^/]+\/chat$/)) return json(route, data.chatMessages);
    if (m(/^\/api\/photos\/[^/]+\/recuerdos$/)) return json(route, []);
    if (m(/^\/api\/photos\/[^/]+\/personas$/)) return json(route, []);

    return route.continue();
  });
}
