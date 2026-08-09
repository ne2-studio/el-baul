// Realistic-looking fixture data for the Google Play store listing screenshots — matches the
// DTO shapes in app/src/api/generated/schema.ts. Consumed by capture-screenshots.mjs, which
// serves this via Playwright route interception instead of seeding a real backend: api-lite's
// chat backend always answers "Respuesta de prueba" and there's no seeding endpoint for rich
// content, so faking the HTTP layer is the only way to get realistic-looking screens.
//
// All photo URLs point at the local static server (serve-photos.mjs) over store-assets/fixtures/photos/.
import { randomUUID } from 'node:crypto';

const uuid = () => randomUUID();

export function buildFixtures(photoBase) {
  const photo = (file) => `${photoBase}/${file}`;

  const baulId = uuid();

  // ---- Personas -------------------------------------------------------------------------
  const personas = {
    carmen: { id: uuid(), nickname: 'Abuela Carmen', name: 'Carmen Ruiz', role: 'custodio', avatar: 'abuela-nieto-apache-indian-grandmothe.jpg' },
    luis: { id: uuid(), nickname: 'Papá Luis', name: 'Luis García', role: 'administrador', avatar: 'bebe-padre-sayre-francis-jr-bab.jpg' },
    ana: { id: uuid(), nickname: 'Mamá Ana', name: 'Ana Torres', role: 'administrador', avatar: 'abuela-nieto-theclay-home.jpg' },
    marta: { id: uuid(), nickname: 'Marta', name: 'Marta García', role: 'colaborador', avatar: 'boda-wedding-couple-on-a-foot.jpg' },
    diego: { id: uuid(), nickname: 'Diego', name: 'Diego Fernández', role: 'colaborador', avatar: 'boda-wedding-couple-9-3090.jpg' },
    pepe: { id: uuid(), nickname: 'Tío Pepe', name: 'José García', role: 'colaborador', avatar: 'pareja-mayor-braunschweig-elderly-c.jpg' },
  };

  const personaDtos = [
    { p: personas.carmen, status: 'active', biografia: 'La memoria de la familia. Guarda cada foto y cada historia como un tesoro — si quieres saber cuándo fue algo, pregúntale a ella antes que a Google.' },
    { p: personas.luis, status: 'active', biografia: 'Siempre con la cámara a mano en las comidas familiares. Suyo es el archivo interminable de fotos borrosas... y también las mejores.' },
    { p: personas.ana, status: 'active', biografia: 'Organiza las quedadas familiares desde hace veinte años. Sin ella, este baúl estaría vacío.' },
    { p: personas.marta, status: 'active', biografia: null },
    { p: personas.diego, status: 'active', biografia: null },
    { p: personas.pepe, status: 'pending', biografia: null },
  ];

  const personaDtoList = personaDtos.map(({ p, status, biografia }) => ({
    id: p.id,
    userId: status === 'active' ? uuid() : null,
    email: status === 'active' ? `${p.nickname.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com` : null,
    name: p.name,
    nickname: p.nickname,
    role: p.role,
    status,
    invitedDate: '2022-03-14T10:00:00Z',
    baulId,
    avatarUrl: photo(p.avatar),
    canEdit: true,
    biografia,
    avatarPhotoId: uuid(),
    avatarCropX: 0.5,
    avatarCropY: 0.35,
    avatarCropScale: 1.4,
  }));

  // ---- Chapters + their photos ------------------------------------------------------------
  const now = new Date('2026-08-05T18:00:00Z');
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();

  function makePhotos(chapterId, files, { dateYear, dateMonth, uploadedBy, createdAt }) {
    return files.map((file) => ({
      id: uuid(),
      chapterId,
      baulId,
      thumbnailUrl: photo(file),
      fullUrl: photo(file),
      dateYear: dateYear ?? null,
      dateMonth: dateMonth ?? null,
      dateDay: null,
      uploadedBy,
      createdAt,
      recuerdoCount: 0,
    }));
  }

  const chapterDefs = [
    {
      key: 'playa',
      name: 'Verano en la playa',
      files: ['playa-familia-family-soccer-on-the-bea.jpg', 'playa-familia-stockholm-sweden-family-.jpg', 'ninos-jugando-children-playing-at-muti.jpg', 'ninos-jugando-children-playing-in-pros.jpg', 'ninos-jugando-guild-park-sculpture-wit.jpg'],
      dateYear: 2024, dateMonth: 7,
      uploadedBy: personas.ana.id,
      createdAt: daysAgo(20),
      latestRecuerdoText: 'Ese verano los peques no salieron del agua ni para comer. Diego se llevó tres pelotas nuevas a la orilla y perdimos dos.',
      latestRecuerdoAuthor: personas.ana.nickname,
    },
    {
      key: 'boda',
      name: 'La boda de Marta y Diego',
      files: ['boda-beach-wedding-photograph.jpg', 'boda-wedding-couple-9-3090.jpg', 'boda-wedding-couple-on-a-foot.jpg'],
      dateYear: 2019, dateMonth: 6,
      uploadedBy: personas.marta.id,
      createdAt: daysAgo(90),
      latestRecuerdoText: 'El mejor día del año. Gracias a todos por venir desde tan lejos a celebrar con nosotros.',
      latestRecuerdoAuthor: personas.marta.nickname,
    },
    {
      key: 'abuelos',
      name: 'Los abuelos',
      files: ['retrato-bn-family-portrait-watch-.jpg', 'retrato-bn-inupiat-family-from-noat.jpg', 'retrato-bn-william-c-white-family-.jpg', 'retrato-vintage-olof-landgren-family-c-1.jpg', 'abuela-nieto-apache-indian-grandmothe.jpg', 'abuela-nieto-theclay-home.jpg', 'abuelo-nieto-bottle-flickr-susanj.jpg', 'madre-hijo-anne-lindbergh-and-son-c.jpg'],
      dateYear: 1968, dateMonth: null,
      uploadedBy: personas.carmen.id,
      createdAt: daysAgo(400),
      latestRecuerdoText: 'Encontré estas en una caja de zapatos en el armario del pasillo. No sabía que existían.',
      latestRecuerdoAuthor: personas.carmen.nickname,
    },
    {
      key: 'cumple',
      name: 'Cumpleaños de los peques',
      files: ['cumpleanos-familia-birthday-celebration-of-.jpg', 'cumpleanos-familia-birthday-party-given-to-.jpg', 'padre-hija-10th-annual-father-daugh.jpg'],
      dateYear: 2023, dateMonth: 5,
      uploadedBy: personas.luis.id,
      createdAt: daysAgo(5),
      latestRecuerdoText: 'Seis años ya. El tiempo pasa demasiado rápido.',
      latestRecuerdoAuthor: personas.luis.nickname,
    },
    {
      key: 'reunion',
      name: 'Reunión de primos',
      files: ['reunion-familiar-sb-family-reunion-2014-.jpg', 'hermanos-hotel-mayaland-chichen-i.jpg', 'pareja-mayor-elderly-couple-at-the-co.jpg'],
      dateYear: 2014, dateMonth: 8,
      uploadedBy: personas.pepe.id,
      createdAt: daysAgo(140),
      latestRecuerdoText: 'No nos juntábamos todos desde la boda de la tía Rosa. Falta repetirlo más a menudo.',
      latestRecuerdoAuthor: personas.pepe.nickname,
    },
    {
      key: 'antes',
      name: 'Antes de que naciera yo',
      files: ['retrato-vintage-vintage-family-from-engl.jpg', 'retrato-vintage-waldemar-riese-family-c-.jpg', 'album-antiguo-hungarian-family-photo-a.jpg', 'madre-hijo-mother-with-sons.jpg', 'bebe-padre-arizona-kodacrhome-may-1.jpg', 'tres-generaciones-dodge-three-generations-.jpg', 'gathering-antiguo-family-gathering-by-e-.jpg', 'gathering-antiguo-family-gathering-on-j-m-.jpg', 'hermanos-sipin-siblings-circa-19.jpg'],
      dateYear: null, dateMonth: null,
      uploadedBy: personas.carmen.id,
      createdAt: daysAgo(600),
      latestRecuerdoText: 'Ni yo sé quiénes son todos en esta foto. Si alguien reconoce a alguien, que lo diga en un recuerdo.',
      latestRecuerdoAuthor: personas.carmen.nickname,
    },
  ];

  const chapters = [];
  const photosByChapter = {};
  for (const def of chapterDefs) {
    const chapterId = uuid();
    const chPhotos = makePhotos(chapterId, def.files, { dateYear: def.dateYear, dateMonth: def.dateMonth, uploadedBy: def.uploadedBy, createdAt: def.createdAt });
    photosByChapter[chapterId] = chPhotos;
    chapters.push({
      id: chapterId,
      baulId,
      name: def.name,
      photoCount: chPhotos.length,
      coverPhotoUrl: chPhotos[0].thumbnailUrl,
      featuredCoverPhotoUrl: chPhotos[0].thumbnailUrl,
      createdAt: def.createdAt,
      updatedAt: def.createdAt,
      recuerdoCount: 1,
      latestRecuerdoText: def.latestRecuerdoText,
      latestRecuerdoAuthor: def.latestRecuerdoAuthor,
      minDateYear: def.dateYear,
      minDateMonth: def.dateMonth,
      minDateDay: null,
      maxDateYear: def.dateYear,
      maxDateMonth: def.dateMonth,
      maxDateDay: null,
      undatedPhotoCount: def.dateYear ? 0 : chPhotos.length,
      _key: def.key,
    });
  }
  const chapterByKey = Object.fromEntries(chapters.map((c) => [c._key, c]));

  // ---- Baúl -------------------------------------------------------------------------------
  const baul = {
    id: baulId,
    name: 'Familia García',
    description: 'Nuestros recuerdos, capítulo a capítulo',
    chapterCount: chapters.length,
    coverPhotoUrl: chapterByKey.abuelos.coverPhotoUrl,
    createdAt: daysAgo(900),
    updatedAt: daysAgo(1),
    isCustodio: true,
    role: 'custodio',
    memberCount: personaDtoList.length,
  };

  // ---- Recuerdos (both chapter-scoped and baúl-level) --------------------------------------
  function recuerdo({ text, persona, photo: photoDto, chapter }) {
    return {
      id: uuid(),
      photoId: photoDto?.id ?? null,
      userId: persona.id,
      text,
      userName: persona.nickname,
      createdAt: photoDto ? photoDto.createdAt : daysAgo(2),
      isOwn: false,
      photoThumbnailUrl: photoDto?.thumbnailUrl ?? null,
      userAvatar: personaDtoList.find((p) => p.id === persona.id)?.avatarUrl ?? null,
      personaId: persona.id,
      chapterId: chapter?.id ?? null,
      chapterName: chapter?.name ?? null,
    };
  }

  const recuerdos = [
    recuerdo({ text: 'Recuerdo que ese verano no queríamos volver a casa. Nos quedamos hasta que se puso el sol.', persona: personas.ana, photo: photosByChapter[chapterByKey.playa.id][0], chapter: chapterByKey.playa }),
    recuerdo({ text: 'La abuela lloró de la risa con el brindis. Fue perfecto.', persona: personas.marta, photo: photosByChapter[chapterByKey.boda.id][2], chapter: chapterByKey.boda }),
    recuerdo({ text: 'No sé quién es el niño de la izquierda pero tiene la misma cara que tú, papá.', persona: personas.luis, photo: photosByChapter[chapterByKey.abuelos.id][4], chapter: chapterByKey.abuelos }),
    recuerdo({ text: 'Pidió la misma tarta de chocolate que el año pasado. Ya es tradición.', persona: personas.luis, photo: photosByChapter[chapterByKey.cumple.id][0], chapter: chapterByKey.cumple }),
    recuerdo({ text: 'Qué ganas de que se repita esta reunión pronto. Se echa de menos a toda la familia junta.', persona: personas.pepe, photo: photosByChapter[chapterByKey.reunion.id][0], chapter: chapterByKey.reunion }),
    recuerdo({ text: 'Cada vez que abro este baúl encuentro algo que no había visto. Gracias a todos por seguir subiendo fotos.', persona: personas.carmen, photo: null, chapter: null }),
  ];

  // ---- Feed (recuerdos + photo-upload batches, newest first) ------------------------------
  function batch({ chapter, persona, createdAt, count }) {
    const chPhotos = photosByChapter[chapter.id];
    return {
      batchId: uuid(),
      userId: persona.id,
      userName: persona.nickname,
      userAvatar: personaDtoList.find((p) => p.id === persona.id)?.avatarUrl ?? null,
      personaId: persona.id,
      photoCount: chPhotos.length,
      chapterId: chapter.id,
      chapterName: chapter.name,
      createdAt,
      previewPhotos: chPhotos.slice(0, Math.min(count, chPhotos.length)),
    };
  }

  const batches = {
    cumple: batch({ chapter: chapterByKey.cumple, persona: personas.luis, createdAt: daysAgo(5), count: 3 }),
    playa: batch({ chapter: chapterByKey.playa, persona: personas.ana, createdAt: daysAgo(20), count: 5 }),
    boda: batch({ chapter: chapterByKey.boda, persona: personas.marta, createdAt: daysAgo(90), count: 3 }),
    reunion: batch({ chapter: chapterByKey.reunion, persona: personas.pepe, createdAt: daysAgo(140), count: 3 }),
  };

  const feedItems = [
    { type: 'recuerdo', createdAt: recuerdos[3].createdAt, recuerdo: recuerdos[3] },
    { type: 'photo_batch', createdAt: batches.cumple.createdAt, photoBatch: batches.cumple },
    { type: 'recuerdo', createdAt: recuerdos[0].createdAt, recuerdo: recuerdos[0] },
    { type: 'photo_batch', createdAt: batches.playa.createdAt, photoBatch: batches.playa },
    { type: 'recuerdo', createdAt: recuerdos[4].createdAt, recuerdo: recuerdos[4] },
    { type: 'photo_batch', createdAt: batches.reunion.createdAt, photoBatch: batches.reunion },
    { type: 'recuerdo', createdAt: recuerdos[1].createdAt, recuerdo: recuerdos[1] },
    { type: 'photo_batch', createdAt: batches.boda.createdAt, photoBatch: batches.boda },
    { type: 'recuerdo', createdAt: recuerdos[2].createdAt, recuerdo: recuerdos[2] },
    { type: 'recuerdo', createdAt: recuerdos[5].createdAt, recuerdo: recuerdos[5] },
  ];

  // ---- Loose photos (a couple not filed under any chapter yet) ----------------------------
  const loosePhotos = makePhotos(null, ['hermanos-hotel-mayaland-chichen-i.jpg'], {
    uploadedBy: personas.pepe.id,
    createdAt: daysAgo(3),
  });

  // ---- Chat conversation --------------------------------------------------------------------
  const chatMessages = [
    { id: uuid(), role: 'user', content: '¿Qué recuerdas de las vacaciones en la playa del verano pasado?', createdAt: daysAgo(4) },
    {
      id: uuid(), role: 'assistant',
      content: 'Según lo que hay en el baúl, en julio de 2024 subisteis 5 fotos al capítulo "Verano en la playa". Ana escribió que los peques no quisieron salir del agua ni para comer, ¡y Diego perdió dos pelotas en la orilla! Parece que fue un verano de esos que se recuerdan con una sonrisa.',
      createdAt: daysAgo(4),
    },
    { id: uuid(), role: 'user', content: '¿Quiénes salen en las fotos de los abuelos?', createdAt: daysAgo(3) },
    {
      id: uuid(), role: 'assistant',
      content: 'El capítulo "Los abuelos" tiene 8 fotos, casi todas de 1968. Carmen las encontró en una caja de zapatos y comentó que ni ella misma recordaba que existían. Si quieres, puedo ayudarte a etiquetar a las personas que aparecen para que sea más fácil encontrarlas la próxima vez.',
      createdAt: daysAgo(3),
    },
    { id: uuid(), role: 'user', content: 'Sí, por favor. Y cuéntame algo bonito sobre la boda de Marta y Diego.', createdAt: daysAgo(1) },
    {
      id: uuid(), role: 'assistant',
      content: 'Claro — voy a preparar las sugerencias de etiquetado. Sobre la boda: fue en junio de 2019, y Marta escribió que fue "el mejor día del año". Fue un capítulo pequeño pero muy querido: solo 3 fotos, pero con un recuerdo precioso de que la abuela Carmen lloró de la risa durante el brindis.',
      createdAt: daysAgo(1),
    },
  ];

  // ---- Invite link / preview -----------------------------------------------------------------
  const inviteToken = 'demo-invite-token';
  const inviteLink = { token: inviteToken, url: `https://elbaul.app/invitacion/baul/${inviteToken}`, createdAt: daysAgo(30) };
  const invitePreview = {
    baulId,
    name: baul.name,
    description: baul.description,
    previewPhotos: [
      chapterByKey.playa.coverPhotoUrl,
      chapterByKey.boda.coverPhotoUrl,
      chapterByKey.cumple.coverPhotoUrl,
      chapterByKey.reunion.coverPhotoUrl,
    ],
    coverPhotoUrl: baul.coverPhotoUrl,
    personaAvatarUrls: personaDtoList.slice(0, 4).map((p) => p.avatarUrl),
  };

  return {
    baulId,
    chapterByKey,
    photosByChapter,
    personas,
    data: {
      appConfig: {
        features: { monetization: false, chatEnabled: true, chatSuggestionsEnabled: true, sharedLinksEnabled: true, baulFeedEnabled: true },
        helpCenterUrl: null,
        appUrl: 'https://elbaul.app',
      },
      baules: [baul],
      baul,
      chapters,
      personas: personaDtoList,
      recuerdos,
      feed: { items: feedItems, hasMore: false },
      loosePhotos,
      chatMessages,
      inviteLink,
      invitePreview,
    },
  };
}
