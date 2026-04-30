/**
 * K2 Marking Scheme - Complete Data Structure & Logic
 *
 * SPM K2 answers are complex, hierarchical documents with:
 * - Multi-part questions: Soalan → (a) → (i)(ii) → points
 * - Flexible marking rules: points allocation, E.C.F, accept any logical answer
 * - Bilingual content (BM + EN)
 * - Multiple answer formats: text, lists, tables, diagrams, formulas
 * - Common student mistakes & corrections
 */

// ──────────────────────────────────────────────────────────────────
// 1. SCHEMA TYPES
// ──────────────────────────────────────────────────────────────────

const BLOCK_TYPES = {
  'answer-section': 'Main Answer Section',
  'alternative': 'Alternative Answer',
  'common-error': 'Common Mistake',
  'marking-guide': 'Marking Guide',
  'criteria': 'Rubric/Criteria',
  'diagram-ref': 'Diagram Reference'
};

const MARKING_RULE_TYPES = {
  'points-allocation': '1 mark × N points',
  'tiered-marks': 'Full (N) / Partial (M)',
  'ecf': 'Error Carried Forward',
  'flexible-accept': 'Accept any logical answer',
  'banding': 'Mark banding (0-2: fail, 3-5: pass)',
};

const CONTENT_TYPES = {
  'text': 'Plain text',
  'list': 'Bullet/numbered list',
  'table': 'Table',
  'formula': 'Formula/equation',
  'diagram': 'Diagram reference',
  'subquestion': 'Sub-part (a)(i) etc)'
};

// ──────────────────────────────────────────────────────────────────
// 2. COMPLETE K2 SCHEMA
// ──────────────────────────────────────────────────────────────────

const K2QuestionSchema = {
  // Metadata
  id: 'q-2025-sejarah-s1-k2-1',
  year: 2025,
  subject: 'Sejarah',
  paper: 'K2',
  questionNo: 1,
  createdAt: '2025-04-30T00:00:00Z',
  updatedAt: '2025-04-30T00:00:00Z',

  // Basic question info
  questionBM: 'Soalan dalam Bahasa Melayu...',
  questionEN: 'Question in English...',

  // Marking structure
  totalMarks: 20,
  passingMark: 10,

  // Rich content blocks
  blocks: [
    {
      // Unique block ID
      id: 'block-1-ans',
      type: 'answer-section', // atau alternative, common-error, etc
      language: 'bm', // bm, en, bilingual
      title: null, // e.g. "Jawapan Utama"

      // Multi-language support
      titleBM: 'Jawapan',
      titleEN: 'Answer',

      // Main content - blocks can contain sub-parts
      content: [
        {
          type: 'subquestion',
          label: '(a)',
          marks: 4,

          // Content can be mixed: text + list + formula + etc
          contentBM: [
            {
              type: 'text',
              text: 'Poin-poin utama dalam jawapan...'
            },
            {
              type: 'list',
              items: [
                { text: 'Poin pertama' },
                { text: 'Poin kedua', subItems: [
                    { text: 'Sub-poin 2.1' },
                    { text: 'Sub-poin 2.2' }
                  ]
                },
                { text: 'Poin ketiga' }
              ]
            }
          ],

          contentEN: [
            {
              type: 'text',
              text: 'Key points in the answer...'
            },
            {
              type: 'list',
              items: [
                { text: 'First point' },
                { text: 'Second point' },
                { text: 'Third point' }
              ]
            }
          ],

          // Marking rule for this sub-part
          markingRule: {
            type: 'points-allocation',
            description: '1 mark untuk setiap poin',
            rules: [
              {
                description: '1 mark per point',
                marks: 1,
                count: 4,
                minPoints: 0,
                maxPoints: 4
              }
            ]
          }
        },

        {
          type: 'subquestion',
          label: '(b)(i)',
          marks: 3,

          contentBM: [
            {
              type: 'text',
              text: 'Jawapan untuk bahagian (b)(i)...'
            }
          ],
          contentEN: [
            {
              type: 'text',
              text: 'Answer for part (b)(i)...'
            }
          ],

          // Flexible acceptance rule
          markingRule: {
            type: 'flexible-accept',
            description: 'Terima sebarang jawapan yang logik dan relevan',
            acceptanceCriteria: 'Asalkan pelajar menunjukkan pemahaman tentang...',
            descriptionEN: 'Accept any logical and relevant answer',
            acceptanceCriteriaEN: 'As long as student shows understanding of...'
          }
        },

        {
          type: 'subquestion',
          label: '(b)(ii)',
          marks: 2,

          contentBM: [
            {
              type: 'text',
              text: 'Jawapan untuk bahagian (b)(ii)...'
            }
          ],
          contentEN: [
            {
              type: 'text',
              text: 'Answer for part (b)(ii)...'
            }
          ],

          // Error Carried Forward rule
          markingRule: {
            type: 'ecf',
            description: 'e.c.f. dari (b)(i)',
            parentPart: '(b)(i)',
            descriptionEN: 'e.c.f. from (b)(i)',
            notes: 'Jika pelajar menggunakan jawapan (b)(i) yang salah tapi proses betul, beri markah penuh'
          }
        },

        {
          type: 'subquestion',
          label: '(c)',
          marks: 8,

          contentBM: [
            {
              type: 'text',
              text: 'Pengenalan ke topik...'
            },
            {
              type: 'list',
              items: [
                {
                  text: 'Argument 1',
                  explanation: 'Penjelasan detail...',
                  marks: 3
                },
                {
                  text: 'Argument 2',
                  explanation: 'Penjelasan detail...',
                  marks: 3
                },
                {
                  text: 'Conclusion',
                  explanation: 'Kesimpulan...',
                  marks: 2
                }
              ]
            }
          ],
          contentEN: [],

          // Banding/Tiered marks rule
          markingRule: {
            type: 'banding',
            bands: [
              {
                minMarks: 7,
                maxMarks: 8,
                description: 'Excellent argument, well-explained',
                criteria: ['All points clear', 'Good structure', 'Relevant examples']
              },
              {
                minMarks: 5,
                maxMarks: 6,
                description: 'Good argument, adequately explained',
                criteria: ['Most points clear', 'Logical flow']
              },
              {
                minMarks: 3,
                maxMarks: 4,
                description: 'Basic argument',
                criteria: ['Main idea present', 'Some explanation']
              },
              {
                minMarks: 0,
                maxMarks: 2,
                description: 'Limited understanding',
                criteria: ['Minimal effort', 'Unclear thinking']
              }
            ]
          }
        }
      ],

      // Optional: Alternative answers for specific sub-parts
      alternatives: [
        {
          applicableToLabels: ['(a)'],
          contentBM: [
            {
              type: 'text',
              text: 'Jawapan alternatif yang juga boleh diterima...'
            }
          ],
          contentEN: [
            {
              type: 'text',
              text: 'Alternative answer that is also acceptable...'
            }
          ],
          note: 'Perlu memenuhi kriteria: ...'
        }
      ]
    },

    {
      id: 'block-2-error',
      type: 'common-error',
      language: 'bilingual',

      titleBM: 'Kesilapan Pelajar yang Kerap',
      titleEN: 'Common Student Mistakes',

      content: [
        {
          mistakeBM: 'Seringkali pelajar salah mengingat tarikh...',
          mistakeEN: 'Students often remember the wrong date...',

          correctionBM: 'Jawapan yang betul ialah...',
          correctionEN: 'The correct answer is...',

          marksToDeduct: 0.5,
          frequency: 'very-common' // common, very-common, rare
        },
        {
          mistakeBM: 'Mereka mengelirukan dua tokoh...',
          mistakeEN: 'They confuse two figures...',

          correctionBM: 'Tokoh A berbeda dengan Tokoh B karena...',
          correctionEN: 'Figure A is different from Figure B because...',

          marksToDeduct: 1,
          frequency: 'common'
        }
      ]
    },

    {
      id: 'block-3-table',
      type: 'answer-section',
      language: 'bm',

      titleBM: 'Jadual Perbandingan (jika soalan minta)',

      content: [
        {
          type: 'table',
          headersBM: ['Aspek', 'Poin A', 'Poin B'],
          headersEN: ['Aspect', 'Point A', 'Point B'],
          rows: [
            ['Tarikh', '1945', '1948'],
            ['Peristiwa', 'Kemerdekaan', 'Perlembagaan'],
            ['Tokoh Penting', 'Merdeka', 'Yazid']
          ],
          explanation: 'Jadual ini menunjukkan...'
        }
      ]
    },

    {
      id: 'block-4-guide',
      type: 'marking-guide',
      language: 'bm',

      titleBM: 'Panduan Keseluruhan Penilaian',

      content: [
        {
          type: 'text',
          text: 'Soalan ini menguji kemampuan pelajar untuk...',

          // Detailed rubric
          rubric: {
            'Comprehension (0-4 marks)': 'Student understands the question and topic',
            'Analysis (0-6 marks)': 'Student can break down the topic and provide analysis',
            'Supporting Evidence (0-6 marks)': 'Student provides relevant examples and facts',
            'Conclusion (0-4 marks)': 'Student provides logical conclusion'
          }
        }
      ]
    },

    {
      id: 'block-5-diagram',
      type: 'diagram-ref',
      language: 'bm',

      content: [
        {
          type: 'diagram',
          referenceBM: 'Rujuk rajah garis masa Perang Dunia II di halaman 5 dalam kertas soalan',
          referenceEN: 'Refer to the World War II timeline diagram on page 5 of the question paper',
          description: 'Pelajar boleh rujuk rajah ini untuk memperkuat jawapan mereka'
        }
      ]
    }
  ],

  // Optional metadata
  metadata: {
    difficulty: 'medium', // easy, medium, hard
    estimatedTime: 25, // minutes
    skillsTested: ['analysis', 'comprehension', 'essay-writing'],
    topicCovered: 'Perang Dunia II',
    acceptLanguageMixing: true,
    notes: 'Soalan essay yang menguji pemahaman mendalam'
  }
};

// ──────────────────────────────────────────────────────────────────
// 3. MARKING RULE HELPERS
// ──────────────────────────────────────────────────────────────────

class MarkingRuleValidator {
  /**
   * Validate student answer against a marking rule
   * Returns: { valid: boolean, marks: number, feedback: string }
   */
  static validateAnswer(studentAnswer, rule) {
    switch (rule.type) {
      case 'points-allocation':
        return this.validatePointsAllocation(studentAnswer, rule);
      case 'flexible-accept':
        return this.validateFlexibleAccept(studentAnswer, rule);
      case 'ecf':
        return this.validateECF(studentAnswer, rule);
      case 'banding':
        return this.validateBanding(studentAnswer, rule);
      case 'tiered-marks':
        return this.validateTieredMarks(studentAnswer, rule);
      default:
        return { valid: true, marks: rule.maxMarks || 0, feedback: 'No specific rule' };
    }
  }

  static validatePointsAllocation(answer, rule) {
    // 1 mark per point × N points
    const pointCount = (answer.match(/\n/g) || []).length + 1; // Simple: count lines
    const marksAwarded = Math.min(pointCount, rule.count || rule.maxMarks);
    return {
      valid: true,
      marks: marksAwarded,
      feedback: `${pointCount} points identified, ${marksAwarded} marks awarded`
    };
  }

  static validateFlexibleAccept(answer, rule) {
    // Accept any answer that shows understanding
    // This is for teacher review
    return {
      valid: null, // Need teacher judgment
      marks: null,
      feedback: `Flexible acceptance: "${rule.description || ''}" - Teacher review required`,
      criteria: rule.acceptanceCriteria
    };
  }

  static validateECF(answer, rule) {
    // Error Carried Forward - accept answer if method is correct
    return {
      valid: null,
      marks: null,
      feedback: `E.C.F. from ${rule.parentPart} - Check if methodology is correct`,
      parentPart: rule.parentPart
    };
  }

  static validateBanding(answer, rule) {
    // Manual banding assessment
    return {
      valid: null,
      marks: null,
      feedback: 'Banding assessment - Teacher review required',
      bands: rule.bands
    };
  }

  static validateTieredMarks(answer, rule) {
    // Full marks or partial marks
    return {
      valid: null,
      marks: null,
      feedback: 'Tiered marks - Teacher review required',
      options: rule.options || ['Full marks (N)', 'Partial marks (M)']
    };
  }
}

// ──────────────────────────────────────────────────────────────────
// 4. SCHEMA BUILDER (for easy construction)
// ──────────────────────────────────────────────────────────────────

class K2SchemaBuilder {
  constructor(questionNo, totalMarks = 20) {
    this.question = {
      id: `q-${Date.now()}`,
      year: new Date().getFullYear(),
      subject: 'Sejarah',
      paper: 'K2',
      questionNo,
      questionBM: '',
      questionEN: '',
      totalMarks,
      passingMark: Math.ceil(totalMarks / 2),
      blocks: []
    };
  }

  setQuestion(textBM, textEN = '') {
    this.question.questionBM = textBM;
    this.question.questionEN = textEN;
    return this;
  }

  addAnswerSection(title = null) {
    const block = {
      id: `block-${this.question.blocks.length + 1}`,
      type: 'answer-section',
      language: 'bm',
      title,
      titleBM: title,
      titleEN: title ? `English: ${title}` : null,
      content: []
    };
    this.question.blocks.push(block);
    this._currentBlock = block;
    return this;
  }

  addPart(label, marks, contentBM, contentEN = '') {
    if (!this._currentBlock) throw new Error('No current block. Call addAnswerSection first');

    const part = {
      type: 'subquestion',
      label,
      marks,
      contentBM: Array.isArray(contentBM) ? contentBM : [{ type: 'text', text: contentBM }],
      contentEN: contentEN ? (Array.isArray(contentEN) ? contentEN : [{ type: 'text', text: contentEN }]) : [],
      markingRule: { type: 'points-allocation', description: `${marks} marks for this part` }
    };

    this._currentBlock.content.push(part);
    return this;
  }

  addCommonError(mistakeBM, correctionBM, mistakeEN = '', correctionEN = '', deduct = 0.5) {
    const block = {
      id: `block-error-${this.question.blocks.length + 1}`,
      type: 'common-error',
      language: 'bilingual',
      titleBM: 'Kesilapan Biasa',
      titleEN: 'Common Mistakes',
      content: [
        {
          mistakeBM,
          mistakeEN,
          correctionBM,
          correctionEN,
          marksToDeduct: deduct
        }
      ]
    };
    this.question.blocks.push(block);
    return this;
  }

  build() {
    return this.question;
  }
}

// ──────────────────────────────────────────────────────────────────
// 5. EXAMPLE USAGE
// ──────────────────────────────────────────────────────────────────

// const q = new K2SchemaBuilder(1, 20)
//   .setQuestion(
//     'Jelaskan penyebab Perang Dunia II dan kesan-kesannya terhadap dunia.',
//     'Explain the causes of World War II and its effects on the world.'
//   )
//   .addAnswerSection('Jawapan Utama')
//   .addPart(
//     '(a)',
//     4,
//     'Penyebab: 1. Perjanjian Versailles, 2. Kebangkitan Hitler, 3. Ekonomi buruk',
//     'Causes: 1. Treaty of Versailles, 2. Rise of Hitler, 3. Economic depression'
//   )
//   .addPart(
//     '(b)',
//     8,
//     'Kesan sosial, ekonomi, dan politik...',
//     'Social, economic, and political impacts...'
//   )
//   .addCommonError(
//     'Pelajar sering salah mengingat tarikh bermula Perang Dunia II',
//     'Bermula tahun 1939, bukan 1940',
//     'Students often remember the wrong start date',
//     'Started in 1939, not 1940',
//     0.5
//   )
//   .build();

// ──────────────────────────────────────────────────────────────────
// 6. GEMINI PROMPT (for extracting from PDF)
// ──────────────────────────────────────────────────────────────────

const GEMINI_EXTRACTION_PROMPT = `
Anda adalah ahli dalam pemeriksaan SPM Sejarah K2 (Essay Paper).

Saya akan memberikan anda PDF jawapan bagi soalan K2. Tugas anda:

1. EXTRACT HIERARCHICAL STRUCTURE:
   - Identifikasi struktur: Soalan → (a) → (i)(ii) → points
   - Kenal pasti pembahagian (part) dengan label yang jelas: (a), (b)(i), (b)(ii), (c), dll

2. RECOGNIZE MARKING RULES:
   - Jika terlihat "1 mark × N points" → type: "points-allocation"
   - Jika terlihat "accept any logical answer" → type: "flexible-accept"
   - Jika terlihat "e.c.f. from (X)" → type: "ecf" dengan parentPart: "(X)"
   - Jika terlihat banding marks (7-8: excellent, 5-6: good, dll) → type: "banding"

3. BILINGUAL SUPPORT:
   - Jika ada BM dan EN, simpan kedua-duanya
   - Jika hanya satu bahasa, isi hanya field yang relevan

4. IDENTIFY ALTERNATIVE ANSWERS:
   - Cari text yang bermula dengan "Jawapan alternatif" atau "OR" atau "Terima juga"
   - Catat field: applicableToLabels, contentBM/EN

5. COMMON MISTAKES:
   - Cari section yang bermula dengan "Kesilapan" atau "NOT"
   - Catat: mistakeBM/EN, correctionBM/EN, marksToDeduct

OUTPUT FORMAT (Valid JSON):

{
  "questionNo": <number>,
  "questionBM": "string",
  "questionEN": "string",
  "totalMarks": <number>,
  "passingMark": <number>,
  "blocks": [
    {
      "type": "answer-section|alternative|common-error|marking-guide",
      "language": "bm|en|bilingual",
      "title": "string or null",
      "content": [
        {
          "type": "subquestion",
          "label": "(a)",
          "marks": <number>,
          "contentBM": [{"type": "text", "text": "..."}, {"type": "list", "items": [...]}],
          "contentEN": [...],
          "markingRule": {
            "type": "points-allocation|flexible-accept|ecf|banding",
            "description": "string",
            "parentPart": "string (for ecf)",
            "bands": [...] (for banding)
          }
        }
      ]
    }
  ]
}

PENTING:
- JSON HARUS VALID
- Tidak ada penjelasan tambahan, hanya JSON
- Jika ada diagram/rajah yang penting, sertakan dalam content dengan type: "diagram-ref"
- Bahasa: gunakan BM untuk markah, label, dan penjelasan marking; EN untuk terjemahan jika diperlukan
`;

// ──────────────────────────────────────────────────────────────────
// 7. EXPORT
// ──────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    K2QuestionSchema,
    MarkingRuleValidator,
    K2SchemaBuilder,
    GEMINI_EXTRACTION_PROMPT,
    BLOCK_TYPES,
    MARKING_RULE_TYPES,
    CONTENT_TYPES
  };
}
