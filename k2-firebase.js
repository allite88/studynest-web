/**
 * K2 Marking Scheme - Firebase Integration
 * Handles: Save, Load, Validate, Publish, Sync with Gemini
 */

import {
  getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore();

/**
 * K2 Database Schema (Firestore):
 *
 * /k2-marking-schemes/{paper}/{questionId}/
 *   - id: string (auto)
 *   - year: number
 *   - subject: string
 *   - questionNo: number
 *   - questionBM: string
 *   - questionEN: string
 *   - totalMarks: number
 *   - passingMark: number
 *   - blocks: array [
 *       {
 *         id, type, language, title,
 *         content: array,
 *         markingRule: object
 *       }
 *     ]
 *   - metadata: { difficulty, estimatedTime, topicCovered, ... }
 *   - version: number
 *   - status: 'draft' | 'review' | 'published' | 'archived'
 *   - createdBy: string (email)
 *   - createdAt: timestamp
 *   - updatedBy: string (email)
 *   - updatedAt: timestamp
 *   - geminiExtracted: boolean
 *   - geminiPromptUsed: string (hash)
 */

class K2MarkingSchemeDB {
  constructor(currentUserEmail) {
    this.userEmail = currentUserEmail;
    this.paper = 'K2';
  }

  // ── SAVE ──────────────────────────────────────────────────────────
  /**
   * Save or update a K2 marking scheme
   */
  async saveQuestion(question) {
    try {
      this.validateQuestion(question);

      const docData = {
        ...question,
        status: question.status || 'draft',
        updatedBy: this.userEmail,
        updatedAt: serverTimestamp(),
        version: (question.version || 0) + 1
      };

      const path = `k2-marking-schemes/${this.paper}/${question.id}`;

      if (question._docId) {
        // Update existing
        await updateDoc(doc(db, path), docData);
        return { success: true, docId: question._docId, message: 'Updated successfully' };
      } else {
        // Create new
        docData.createdBy = this.userEmail;
        docData.createdAt = serverTimestamp();
        docData.version = 1;

        const ref = await addDoc(collection(db, `k2-marking-schemes/${this.paper}`), docData);
        return { success: true, docId: ref.id, message: 'Created successfully' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save multiple questions at once (batch)
   */
  async saveQuestionsBatch(questions) {
    try {
      questions.forEach(q => this.validateQuestion(q));

      const batch = writeBatch(db);
      const results = [];

      questions.forEach(question => {
        const docData = {
          ...question,
          updatedBy: this.userEmail,
          updatedAt: serverTimestamp(),
          version: (question.version || 0) + 1
        };

        if (!question._docId) {
          docData.createdBy = this.userEmail;
          docData.createdAt = serverTimestamp();
          docData.version = 1;
          question._docId = `temp-${Date.now()}-${Math.random()}`;
        }

        const docRef = doc(db, `k2-marking-schemes/${this.paper}/${question._docId}`);
        batch.set(docRef, docData, { merge: true });
        results.push({ questionNo: question.questionNo, docId: question._docId });
      });

      await batch.commit();
      return { success: true, saved: results.length, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ── LOAD ──────────────────────────────────────────────────────────
  /**
   * Load all K2 questions for a subject/year
   */
  async loadQuestions(subject, year = null, status = null) {
    try {
      let q = query(
        collection(db, `k2-marking-schemes/${this.paper}`),
        where('subject', '==', subject)
      );

      if (year) q = query(q, where('year', '==', year));
      if (status) q = query(q, where('status', '==', status));

      q = query(q, orderBy('questionNo', 'asc'));

      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        _docId: d.id,
        ...d.data()
      }));
    } catch (error) {
      console.error('Error loading questions:', error);
      return [];
    }
  }

  /**
   * Load a single question
   */
  async loadQuestion(questionId) {
    try {
      const snap = await getDoc(
        doc(db, `k2-marking-schemes/${this.paper}/${questionId}`)
      );
      if (snap.exists()) {
        return { _docId: snap.id, ...snap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error loading question:', error);
      return null;
    }
  }

  // ── VALIDATION ────────────────────────────────────────────────────
  /**
   * Validate K2 schema completeness and consistency
   */
  validateQuestion(question) {
    const errors = [];

    // Required fields
    if (!question.questionNo) errors.push('questionNo is required');
    if (!question.questionBM?.trim()) errors.push('questionBM cannot be empty');
    if (!question.totalMarks || question.totalMarks <= 0) errors.push('totalMarks must be > 0');
    if (!question.blocks || question.blocks.length === 0) errors.push('At least one block required');

    // Block validation
    question.blocks.forEach((block, i) => {
      if (!block.type) errors.push(`Block ${i}: type is required`);
      if (!block.content || block.content.length === 0) {
        errors.push(`Block ${i}: content cannot be empty`);
      }

      // Sub-question validation
      block.content.forEach((item, j) => {
        if (item.type === 'subquestion') {
          if (!item.label) errors.push(`Block ${i}, Item ${j}: label required`);
          if (!item.marks || item.marks <= 0) errors.push(`Block ${i}, Item ${j}: marks must be > 0`);
          if (!item.contentBM?.length) errors.push(`Block ${i}, Item ${j}: contentBM required`);
        }
      });

      // Marking rule validation
      if (block.content.some(c => c.type === 'subquestion') && !block.markingRule) {
        // Actually, each part has its own marking rule, not the block
      }
    });

    // Total marks check
    const totalSubQuestionMarks = question.blocks
      .flatMap(b => b.content)
      .filter(c => c.type === 'subquestion')
      .reduce((sum, c) => sum + (c.marks || 0), 0);

    if (totalSubQuestionMarks !== question.totalMarks) {
      errors.push(
        `Mark mismatch: sub-questions total ${totalSubQuestionMarks}, ` +
        `but totalMarks is ${question.totalMarks}`
      );
    }

    if (errors.length > 0) {
      throw new Error('Validation failed:\n' + errors.join('\n'));
    }

    return true;
  }

  /**
   * Check integrity and consistency across questions
   */
  async validateConsistency(questions) {
    const issues = [];

    // Check for duplicate question numbers
    const qNumbers = questions.map(q => q.questionNo);
    const duplicates = qNumbers.filter((v, i) => qNumbers.indexOf(v) !== i);
    if (duplicates.length) issues.push(`Duplicate question numbers: ${duplicates.join(', ')}`);

    // Check for orphaned references (e.g., E.C.F. from non-existent part)
    questions.forEach(q => {
      const partLabels = q.blocks
        .flatMap(b => b.content)
        .filter(c => c.type === 'subquestion')
        .map(c => c.label);

      q.blocks.forEach(b => {
        b.content.forEach(c => {
          if (c.markingRule?.type === 'ecf' && c.markingRule.parentPart) {
            if (!partLabels.includes(c.markingRule.parentPart)) {
              issues.push(
                `Q${q.questionNo}: E.C.F. references non-existent part ` +
                `${c.markingRule.parentPart}`
              );
            }
          }
        });
      });
    });

    return { valid: issues.length === 0, issues };
  }

  // ── PUBLISH ───────────────────────────────────────────────────────
  /**
   * Publish a question (mark as ready for students)
   */
  async publishQuestion(questionId) {
    try {
      const q = await this.loadQuestion(questionId);
      if (!q) throw new Error('Question not found');

      this.validateQuestion(q);

      const path = `k2-marking-schemes/${this.paper}/${questionId}`;
      await updateDoc(doc(db, path), {
        status: 'published',
        publishedAt: serverTimestamp(),
        publishedBy: this.userEmail
      });

      return { success: true, message: 'Published successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Archive a question
   */
  async archiveQuestion(questionId) {
    try {
      const path = `k2-marking-schemes/${this.paper}/${questionId}`;
      await updateDoc(doc(db, path), {
        status: 'archived',
        archivedAt: serverTimestamp(),
        archivedBy: this.userEmail
      });

      return { success: true, message: 'Archived' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────
  /**
   * Delete a question
   */
  async deleteQuestion(questionId) {
    try {
      const path = `k2-marking-schemes/${this.paper}/${questionId}`;
      await deleteDoc(doc(db, path));
      return { success: true, message: 'Deleted' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ── GEMINI SYNC ───────────────────────────────────────────────────
  /**
   * Save Gemini extraction metadata
   */
  async markGeminiExtracted(questionId, promptHash) {
    try {
      const path = `k2-marking-schemes/${this.paper}/${questionId}`;
      await updateDoc(doc(db, path), {
        geminiExtracted: true,
        geminiPromptUsed: promptHash,
        geminiExtractedAt: serverTimestamp(),
        geminiExtractedBy: this.userEmail
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audit log for a question
   */
  async getAuditLog(questionId) {
    // Note: This requires setting up Cloud Firestore with detailed logging
    // For now, we just track version and updatedBy in the document
    const q = await this.loadQuestion(questionId);
    if (!q) return null;

    return {
      createdBy: q.createdBy,
      createdAt: q.createdAt,
      updatedBy: q.updatedBy,
      updatedAt: q.updatedAt,
      version: q.version,
      status: q.status,
      publishedBy: q.publishedBy || null,
      publishedAt: q.publishedAt || null
    };
  }

  // ── EXPORT ────────────────────────────────────────────────────────
  /**
   * Export questions as JSON
   */
  async exportAsJSON(questions) {
    return JSON.stringify(questions, null, 2);
  }

  /**
   * Export questions as CSV (for easier editing in Excel/Sheets)
   */
  async exportAsCSV(questions) {
    const rows = [
      ['Question No', 'Total Marks', 'Question (BM)', 'Blocks Count', 'Status', 'Updated At']
    ];

    questions.forEach(q => {
      rows.push([
        q.questionNo,
        q.totalMarks,
        q.questionBM.substring(0, 100),
        q.blocks.length,
        q.status || 'draft',
        q.updatedAt ? new Date(q.updatedAt).toISOString() : ''
      ]);
    });

    return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  // ── STATISTICS ────────────────────────────────────────────────────
  /**
   * Get statistics about K2 questions
   */
  async getStats(subject, year = null) {
    try {
      const questions = await this.loadQuestions(subject, year);

      const stats = {
        totalQuestions: questions.length,
        totalMarks: questions.reduce((sum, q) => sum + (q.totalMarks || 0), 0),
        byStatus: {},
        byDifficulty: {},
        avgMarksPerQuestion: 0,
        blocksPerQuestion: 0,
        completeness: 0
      };

      // Count by status
      questions.forEach(q => {
        const status = q.status || 'draft';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      // Count by difficulty
      questions.forEach(q => {
        const diff = q.metadata?.difficulty || 'unknown';
        stats.byDifficulty[diff] = (stats.byDifficulty[diff] || 0) + 1;
      });

      // Averages
      if (questions.length > 0) {
        stats.avgMarksPerQuestion = (stats.totalMarks / questions.length).toFixed(1);
        const totalBlocks = questions.reduce((sum, q) => sum + (q.blocks?.length || 0), 0);
        stats.blocksPerQuestion = (totalBlocks / questions.length).toFixed(1);

        // Completeness: published / total
        const published = questions.filter(q => q.status === 'published').length;
        stats.completeness = Math.round((published / questions.length) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}

// ── EXPORT ──────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { K2MarkingSchemeDB };
}
