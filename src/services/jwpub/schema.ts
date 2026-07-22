// Esquema mínimo del SQLite de un .jwpub que JW Library abre y lee. Extraído
// de archivos oficiales; se omiten las tablas de índice de búsqueda,
// notas/citas y multimedia (fases posteriores) — el lector no las exige para
// renderizar texto.

export const JWPUB_SCHEMA = `
CREATE TABLE Publication (
  PublicationId INTEGER PRIMARY KEY, VersionNumber INTEGER, Type INTEGER,
  Title TEXT, TitleRich TEXT, RootSymbol TEXT, RootYear INTEGER,
  RootMepsLanguageIndex INTEGER, ShortTitle TEXT, ShortTitleRich TEXT,
  DisplayTitle TEXT, DisplayTitleRich TEXT, ReferenceTitle TEXT,
  ReferenceTitleRich TEXT, UndatedReferenceTitle TEXT,
  UndatedReferenceTitleRich TEXT, Symbol TEXT NOT NULL, UndatedSymbol TEXT,
  UniqueSymbol TEXT, EnglishSymbol TEXT, UniqueEnglishSymbol TEXT NOT NULL,
  IssueTagNumber TEXT, IssueNumber INTEGER, Variation TEXT, Year INTEGER NOT NULL,
  VolumeNumber INTEGER, MepsLanguageIndex INTEGER NOT NULL, PublicationType TEXT,
  PublicationCategorySymbol TEXT, BibleVersionForCitations TEXT,
  HasPublicationChapterNumbers BOOLEAN, HasPublicationSectionNumbers BOOLEAN,
  FirstDatedTextDateOffset DATE, LastDatedTextDateOffset DATE, MepsBuildNumber INTEGER
);
CREATE TABLE PublicationCategory (
  PublicationCategoryId INTEGER PRIMARY KEY,
  PublicationId REFERENCES Publication (PublicationId), Category TEXT
);
CREATE TABLE PublicationYear (
  PublicationYearId INTEGER PRIMARY KEY,
  PublicationId REFERENCES Publication (PublicationId), Year INTEGER
);
CREATE TABLE PublicationView (
  PublicationViewId INTEGER PRIMARY KEY, Name TEXT, Symbol TEXT UNIQUE NOT NULL
);
CREATE TABLE PublicationViewSchema (
  PublicationViewSchemaId INTEGER PRIMARY KEY, SchemaType INTEGER, DataType TEXT
);
CREATE TABLE PublicationViewItem (
  PublicationViewItemId INTEGER PRIMARY KEY,
  PublicationViewId INTEGER REFERENCES PublicationView (PublicationViewId),
  ParentPublicationViewItemId INTEGER, Title TEXT, TitleRich TEXT,
  SchemaType INTEGER, ChildTemplateSchemaType INTEGER, DefaultDocumentId INTEGER
);
CREATE TABLE PublicationViewItemField (
  PublicationViewItemFieldId INTEGER PRIMARY KEY,
  PublicationViewItemId INTEGER REFERENCES PublicationViewItem (PublicationViewItemId),
  Value TEXT, ValueRich TEXT, Type TEXT
);
CREATE TABLE PublicationViewItemDocument (
  PublicationViewItemDocumentId INTEGER PRIMARY KEY,
  PublicationViewItemId INTEGER REFERENCES PublicationViewItem (PublicationViewItemId),
  DocumentId INTEGER
);
CREATE TABLE Document (
  DocumentId INTEGER PRIMARY KEY,
  PublicationId INTEGER REFERENCES Publication (PublicationId),
  MepsDocumentId INTEGER, MepsLanguageIndex INTEGER, Class TEXT, Type INTEGER,
  SectionNumber INTEGER, ChapterNumber INTEGER, Title TEXT, TitleRich TEXT,
  TocTitle TEXT, TocTitleRich TEXT, ContextTitle TEXT, ContextTitleRich TEXT,
  FeatureTitle TEXT, FeatureTitleRich TEXT, Subtitle TEXT, SubtitleRich TEXT,
  FeatureSubtitle TEXT, FeatureSubtitleRich TEXT, Content BLOB,
  FirstFootnoteId INTEGER, LastFootnoteId INTEGER, FirstBibleCitationId INTEGER,
  LastBibleCitationId INTEGER, ParagraphCount INTEGER, HasMediaLinks BOOLEAN,
  HasLinks BOOLEAN, FirstPageNumber INTEGER, LastPageNumber INTEGER,
  ContentLength INTEGER, PreferredPresentation TEXT, ContentReworkedDate TEXT,
  HasPronunciationGuide BOOLEAN
);
CREATE TABLE DocumentParagraph (
  DocumentParagraphId INTEGER PRIMARY KEY, DocumentId INTEGER, ParagraphIndex INTEGER,
  ParagraphNumberLabel INTEGER, BeginPosition INTEGER, EndPosition INTEGER
);
CREATE TABLE TextUnit (TextUnitId INTEGER PRIMARY KEY, Type TEXT, Id INTEGER);
CREATE TABLE DocumentMetadata (
  DocumentMetadataId INTEGER PRIMARY KEY, DocumentId INTEGER, MetadataKey TEXT,
  Value TEXT, ValueRich TEXT
);
CREATE TABLE android_metadata (locale TEXT DEFAULT 'en_US');
`;
