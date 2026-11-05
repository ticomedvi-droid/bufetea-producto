// Textos fijos que Bufetea envía a los clientes, en los idiomas más habituales. Lo que no esté aquí lo traduce la IA.
export type Idioma = "es" | "en" | "fr" | "ro" | "ar" | "zh";
type Textos = {
  pedirCodigo: string; codigoMal: string; bloqueado: string; derivar: string; sinNovedad: string; noCliente: string;
  estado: (asunto: string, fase: string | null, ultima: string | null, fecha: string | null) => string;
  pieAprobado: (abogado: string, despacho: string) => string; pieAuto: (despacho: string) => string; soyIA: (despacho: string) => string;
};

export const TEXTOS: Record<Idioma, Textos> = {
  es: {
    pedirCodigo: "Para hablar de su asunto necesitamos confirmar que es usted. Escriba, por favor, el código de 6 cifras que le dio el despacho.",
    codigoMal: "Ese código no es correcto. Revíselo y vuelva a escribirlo, por favor.",
    bloqueado: "Por seguridad no podemos seguir con la verificación ahora mismo. Su abogado le contactará.",
    derivar: "Esa pregunta se la tiene que contestar su abogado. Le hemos avisado y le responderá lo antes posible.",
    sinNovedad: "Por ahora no hay novedades nuevas en su asunto. En cuanto las haya, se las contamos.",
    noCliente: "Hemos recibido su mensaje. Una persona del despacho le contestará lo antes posible.",
    estado: (a, f, u, d) => `Sobre «${a}»:${f ? ` ahora está en la fase «${f}».` : ""}${u ? `\n\nÚltima novedad${d ? ` (${d})` : ""}: ${u}` : "\n\nTodavía no hay novedades nuevas."}`,
    pieAprobado: (ab, de) => `Mensaje redactado con ayuda de IA y aprobado por ${ab}, de ${de}.`,
    pieAuto: (de) => `Aviso automático de ${de}, enviado con ayuda de IA según las reglas del despacho.`,
    soyIA: (de) => `Le atiende el asistente virtual (IA) de ${de}.`,
  },
  en: {
    pedirCodigo: "To talk about your case we need to confirm it is you. Please type the 6-digit code the law firm gave you.",
    codigoMal: "That code is not correct. Please check it and type it again.",
    bloqueado: "For security reasons we cannot continue the verification right now. Your lawyer will contact you.",
    derivar: "That question has to be answered by your lawyer. We have let them know and they will reply as soon as possible.",
    sinNovedad: "There is no new update on your case yet. We will let you know as soon as there is.",
    noCliente: "We have received your message. Someone from the law firm will reply as soon as possible.",
    estado: (a, f, u, d) => `About «${a}»:${f ? ` it is now at the stage «${f}».` : ""}${u ? `\n\nLatest update${d ? ` (${d})` : ""}: ${u}` : "\n\nThere is no new update yet."}`,
    pieAprobado: (ab, de) => `Message written with the help of AI and approved by ${ab}, of ${de}.`,
    pieAuto: (de) => `Automatic notice from ${de}, sent with the help of AI under the firm's rules.`,
    soyIA: (de) => `You are talking to the virtual assistant (AI) of ${de}.`,
  },
  fr: {
    pedirCodigo: "Pour parler de votre dossier, nous devons confirmer votre identité. Veuillez écrire le code à 6 chiffres que le cabinet vous a donné.",
    codigoMal: "Ce code n'est pas correct. Vérifiez-le et écrivez-le à nouveau, s'il vous plaît.",
    bloqueado: "Pour des raisons de sécurité, nous ne pouvons pas poursuivre la vérification pour le moment. Votre avocat vous contactera.",
    derivar: "C'est votre avocat qui doit répondre à cette question. Nous l'avons prévenu et il vous répondra dès que possible.",
    sinNovedad: "Il n'y a pas encore de nouvelle information sur votre dossier. Nous vous préviendrons dès qu'il y en aura.",
    noCliente: "Nous avons bien reçu votre message. Une personne du cabinet vous répondra dès que possible.",
    estado: (a, f, u, d) => `Concernant « ${a} » :${f ? ` il en est à l'étape « ${f} ».` : ""}${u ? `\n\nDernière nouvelle${d ? ` (${d})` : ""} : ${u}` : "\n\nIl n'y a pas encore de nouvelle information."}`,
    pieAprobado: (ab, de) => `Message rédigé avec l'aide de l'IA et approuvé par ${ab}, de ${de}.`,
    pieAuto: (de) => `Avis automatique de ${de}, envoyé avec l'aide de l'IA selon les règles du cabinet.`,
    soyIA: (de) => `Vous parlez avec l'assistant virtuel (IA) de ${de}.`,
  },
  ro: {
    pedirCodigo: "Pentru a vorbi despre dosarul dumneavoastră trebuie să confirmăm că sunteți dumneavoastră. Vă rugăm să scrieți codul de 6 cifre primit de la cabinet.",
    codigoMal: "Codul nu este corect. Vă rugăm să-l verificați și să-l scrieți din nou.",
    bloqueado: "Din motive de securitate nu putem continua verificarea acum. Avocatul dumneavoastră vă va contacta.",
    derivar: "La această întrebare trebuie să vă răspundă avocatul dumneavoastră. L-am anunțat și vă va răspunde cât mai curând.",
    sinNovedad: "Deocamdată nu există noutăți în dosarul dumneavoastră. Vă anunțăm imediat ce apar.",
    noCliente: "Am primit mesajul dumneavoastră. O persoană de la cabinet vă va răspunde cât mai curând.",
    estado: (a, f, u, d) => `Despre „${a}”:${f ? ` acum se află în etapa „${f}”.` : ""}${u ? `\n\nUltima noutate${d ? ` (${d})` : ""}: ${u}` : "\n\nÎncă nu există noutăți."}`,
    pieAprobado: (ab, de) => `Mesaj redactat cu ajutorul IA și aprobat de ${ab}, de la ${de}.`,
    pieAuto: (de) => `Notificare automată de la ${de}, trimisă cu ajutorul IA conform regulilor cabinetului.`,
    soyIA: (de) => `Vorbiți cu asistentul virtual (IA) al ${de}.`,
  },
  ar: {
    pedirCodigo: "للتحدث عن قضيتك نحتاج إلى التأكد من هويتك. يرجى كتابة الرمز المكوّن من 6 أرقام الذي أعطاك إياه المكتب.",
    codigoMal: "هذا الرمز غير صحيح. يرجى التحقق منه وكتابته مرة أخرى.",
    bloqueado: "لأسباب أمنية لا يمكننا متابعة التحقق الآن. سيتصل بك محاميك.",
    derivar: "يجب أن يجيب محاميك على هذا السؤال. لقد أبلغناه وسيرد عليك في أقرب وقت ممكن.",
    sinNovedad: "لا توجد مستجدات في قضيتك حتى الآن. سنخبرك فور وجودها.",
    noCliente: "لقد استلمنا رسالتك. سيرد عليك أحد أفراد المكتب في أقرب وقت ممكن.",
    estado: (a, f, u, d) => `بخصوص «${a}»:${f ? ` المرحلة الحالية «${f}».` : ""}${u ? `\n\nآخر المستجدات${d ? ` (${d})` : ""}: ${u}` : "\n\nلا توجد مستجدات بعد."}`,
    pieAprobado: (ab, de) => `رسالة كُتبت بمساعدة الذكاء الاصطناعي ووافق عليها ${ab} من ${de}.`,
    pieAuto: (de) => `إشعار تلقائي من ${de}، أُرسل بمساعدة الذكاء الاصطناعي وفق قواعد المكتب.`,
    soyIA: (de) => `يتحدث معك المساعد الافتراضي (ذكاء اصطناعي) لـ ${de}.`,
  },
  zh: {
    pedirCodigo: "为了谈论您的案件，我们需要确认您的身份。请输入律所给您的6位数代码。",
    codigoMal: "该代码不正确。请检查后重新输入。",
    bloqueado: "出于安全原因，我们目前无法继续验证。您的律师会与您联系。",
    derivar: "这个问题需要由您的律师回答。我们已经通知了律师，他会尽快回复您。",
    sinNovedad: "您的案件目前还没有新的进展。一有消息我们会立即通知您。",
    noCliente: "我们已收到您的消息。律所的工作人员会尽快回复您。",
    estado: (a, f, u, d) => `关于「${a}」：${f ? `目前处于「${f}」阶段。` : ""}${u ? `\n\n最新进展${d ? `（${d}）` : ""}：${u}` : "\n\n暂时还没有新的进展。"}`,
    pieAprobado: (ab, de) => `本消息在人工智能的帮助下撰写，并由${de}的${ab}批准。`,
    pieAuto: (de) => `${de}的自动通知，根据律所的规则在人工智能的帮助下发送。`,
    soyIA: (de) => `为您服务的是${de}的虚拟助手（人工智能）。`,
  },
};

export const textos = (idioma: string | null | undefined): Textos => TEXTOS[(idioma ?? "es") as Idioma] ?? TEXTOS.es;
export const tieneTextos = (idioma: string) => idioma in TEXTOS;
