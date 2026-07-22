import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { JWPUB_SCHEMA } from './schema';
import { buildChapterHtml } from './htmlBuilder';
import { encryptContent } from './crypto';
import { JwpubInput } from './types';

// Construye el SQLite del .jwpub (Uint8Array) a partir de la entrada del
// usuario. Cada capítulo es un Document con su Content cifrado, su ítem en el
// índice de navegación y sus párrafos.

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;
const getSql = () => {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => sqlWasmUrl });
  }
  return sqlPromise;
};

export const buildDatabase = async (
  input: JwpubInput
): Promise<Uint8Array> => {
  const SQL = await getSql();
  const db: Database = new SQL.Database();

  try {
    db.run(JWPUB_SCHEMA);
    db.run("INSERT INTO android_metadata (locale) VALUES ('en_US')");

    const { symbol, year, languageIndex, title } = input;

    // Publication (una fila). La terna languageIndex/symbol/year DEBE coincidir
    // con el pubCard de cifrado y con manifest.publication.
    db.run(
      `INSERT INTO Publication (
        PublicationId, VersionNumber, Type, Title, RootSymbol, RootYear,
        RootMepsLanguageIndex, ShortTitle, DisplayTitle, ReferenceTitle,
        UndatedReferenceTitle, Symbol, UndatedSymbol, UniqueSymbol,
        EnglishSymbol, UniqueEnglishSymbol, IssueTagNumber, IssueNumber,
        Variation, Year, MepsLanguageIndex, PublicationType,
        PublicationCategorySymbol, BibleVersionForCitations,
        HasPublicationChapterNumbers, HasPublicationSectionNumbers,
        MepsBuildNumber
      ) VALUES (1, 9, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', 0, '', ?, ?, 'Book', 'bk', 'NWTR', 0, 0, 14074)`,
      [
        title,
        symbol,
        year,
        languageIndex,
        title,
        title,
        title,
        title,
        symbol,
        symbol,
        symbol,
        symbol,
        symbol,
        year,
        languageIndex,
      ]
    );

    db.run(
      'INSERT INTO PublicationCategory (PublicationCategoryId, PublicationId, Category) VALUES (1, 1, ?)',
      ['bk']
    );
    db.run(
      'INSERT INTO PublicationYear (PublicationYearId, PublicationId, Year) VALUES (1, 1, ?)',
      [year]
    );
    db.run(
      "INSERT INTO PublicationView (PublicationViewId, Name, Symbol) VALUES (1, 'JW App Publication', 'jwpub')"
    );
    db.run(
      "INSERT INTO PublicationViewSchema (PublicationViewSchemaId, SchemaType, DataType) VALUES (1, 0, 'name')"
    );

    // sql.js es síncrono pero encryptContent es async, así que recorremos los
    // capítulos con await. Cada capítulo: ítem del índice + Document + párrafos.
    for (let i = 0; i < input.chapters.length; i++) {
      const chapter = input.chapters[i];
      const documentId = i; // 0-based, como los archivos oficiales
      const built = buildChapterHtml(chapter);

      // Índice de navegación: un ítem por capítulo, hijo de la raíz (-1).
      const viewItemId = i + 1;
      db.run(
        `INSERT INTO PublicationViewItem (
          PublicationViewItemId, PublicationViewId, ParentPublicationViewItemId,
          Title, SchemaType, DefaultDocumentId
        ) VALUES (?, 1, -1, ?, 0, ?)`,
        [viewItemId, chapter.title, documentId]
      );
      db.run(
        "INSERT INTO PublicationViewItemField (PublicationViewItemFieldId, PublicationViewItemId, Value, Type) VALUES (?, ?, ?, 'name')",
        [viewItemId, viewItemId, chapter.title]
      );
      db.run(
        'INSERT INTO PublicationViewItemDocument (PublicationViewItemDocumentId, PublicationViewItemId, DocumentId) VALUES (?, ?, ?)',
        [viewItemId, viewItemId, documentId]
      );

      db.run('INSERT INTO TextUnit (TextUnitId, Type, Id) VALUES (?, ?, ?)', [
        documentId,
        'Document',
        documentId,
      ]);

      const blob = await encryptContent(built.html, {
        languageIndex,
        symbol,
        year,
      });

      db.run(
        `INSERT INTO Document (
          DocumentId, PublicationId, MepsDocumentId, MepsLanguageIndex, Class,
          Type, Title, Content, ParagraphCount, ContentLength, PreferredPresentation
        ) VALUES (?, 1, ?, ?, '40', 0, ?, ?, ?, ?, 'text')`,
        [
          documentId,
          1000000001 + i,
          languageIndex,
          chapter.title,
          blob,
          built.paragraphs.length,
          built.contentLength,
        ]
      );

      db.run(
        "INSERT INTO DocumentMetadata (DocumentMetadataId, DocumentId, MetadataKey, Value) VALUES (?, ?, 'MEPS:Title', ?)",
        [i + 1, documentId, chapter.title]
      );

      let dpId = i * 10000;
      for (const p of built.paragraphs) {
        dpId++;
        db.run(
          `INSERT INTO DocumentParagraph (
            DocumentParagraphId, DocumentId, ParagraphIndex, BeginPosition, EndPosition
          ) VALUES (?, ?, ?, ?, ?)`,
          [dpId, documentId, p.index, p.begin, p.end]
        );
      }
    }

    return db.export();
  } finally {
    db.close();
  }
};
