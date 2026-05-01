/**
 * K2 Marking Builder - 升级函数库
 * 用途：支持 schemaVersion 2 和多种答题类型
 * 位置：粘贴到 admin.html 的 <script> 中
 */

// ==========================================
// 数据模型函数
// ==========================================

/**
 * 获取数据版本
 */
function getSchemaVersion(question) {
  return question.schemaVersion || 1;
}

/**
 * 获取子部分的答题类型
 * 智能检测：如果没有设置 answerType，根据存在的数据推断
 */
function getPartAnswerType(part) {
  if (part.answerType) return part.answerType;

  // 根据现有数据推断
  if (part.markingUnits?.length) return 'point_based';
  if (part.steps?.length) return 'calculation_steps';
  if (part.table?.rows?.length) return 'table_cells';
  if (part.rubric?.bands?.length) return 'rubric_based';
  if (part.modelAnswer && part.modelAnswer.includes('=')) return 'formula';

  // 默认
  return 'point_based';
}

/**
 * 检查子部分的完整性
 * 返回警告信息数组
 */
function getPartCompletenessWarnings(part) {
  const warnings = [];
  const type = getPartAnswerType(part);

  // 通用检查
  if (!part.marks || part.marks <= 0) {
    warnings.push('缺少分数 (marks)');
  }
  if (!part.answerType) {
    warnings.push('未设置 answerType');
  }

  // 类型特定检查
  if (type === 'point_based' || type === 'keyword_concept') {
    if (!part.markingUnits?.length && !part.markingPoints?.length) {
      warnings.push('无标记单位或旧标记点');
    }
  }
  if (type === 'calculation_steps') {
    if (!part.steps?.length) {
      warnings.push('无计算步骤');
    }
  }
  if (type === 'table_cells') {
    if (!part.table || !part.table.rows?.length) {
      warnings.push('表格无行');
    }
  }
  if (type === 'rubric_based') {
    if (!part.rubric?.bands?.length) {
      warnings.push('无评分带 (rubric bands)');
    }
  }

  return warnings;
}

/**
 * 合并两组 parts（用于导入）
 * existingParts: 当前数据
 * newParts: 导入的新数据
 */
function mergePartsByIndex(existingParts, newParts) {
  const merged = {};

  // 先添加现有的
  existingParts.forEach((p, idx) => {
    merged[idx] = p;
  });

  // 按 index 或 part label 匹配新数据
  newParts.forEach((newP, idx) => {
    if (merged[idx]) {
      // 同 index，合并（新数据优先，但保留某些字段）
      merged[idx] = {
        ...merged[idx],
        ...newP,
        qImgs: merged[idx].qImgs || newP.qImgs || [],
        // 不覆盖已有的 q, qEN（管理员可能已编辑过）
      };
    } else {
      // 新 index
      merged[idx] = newP;
    }
  });

  return Object.values(merged);
}

// ==========================================
// Admin 编辑函数
// ==========================================

/**
 * 设置子部分字段值
 */
function qaeSetPartField(qi, pi, field, value) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;
  qaeQuestions[qi].parts[pi][field] = value;
  renderQAList();
}

/**
 * 添加标记单位
 */
function qaeAddMarkingUnit(qi, pi) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;

  const part = qaeQuestions[qi].parts[pi];
  if (!part.markingUnits) part.markingUnits = [];

  part.markingUnits.push({
    text: '',
    marks: 1,
    aliases: [],
    mustHave: [],
    niceToHave: [],
    intent: '',
    group: `unit-${part.markingUnits.length}`,
    noDoubleCount: true,
    feedbackIfMissing: ''
  });

  renderSubPartEditor(qi, pi);
}

/**
 * 编辑标记单位字段
 */
function qaeSetMarkingUnit(qi, pi, ui, field, value) {
  if (!qaeQuestions[qi]?.parts?.[pi]?.markingUnits?.[ui]) return;

  const unit = qaeQuestions[qi].parts[pi].markingUnits[ui];
  unit[field] = value;

  renderSubPartEditor(qi, pi);
}

/**
 * 删除标记单位
 */
function qaeDelMarkingUnit(qi, pi, ui) {
  if (!qaeQuestions[qi]?.parts?.[pi]?.markingUnits?.[ui]) return;

  qaeQuestions[qi].parts[pi].markingUnits.splice(ui, 1);
  renderSubPartEditor(qi, pi);
}

/**
 * 将旧的 markingPoints 转换为新的 markingUnits
 */
function qaeConvertPointsToUnits(qi, pi) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;

  const part = qaeQuestions[qi].parts[pi];
  if (!part.markingPoints?.length) return;

  part.markingUnits = (part.markingPoints || []).map((point, idx) => ({
    text: point,
    marks: 1,
    aliases: [],
    mustHave: [],
    niceToHave: [],
    intent: '',
    group: `converted-${idx}`,
    noDoubleCount: true,
    feedbackIfMissing: `缺少: ${point}`
  }));

  // 可选：清除旧数据
  // delete part.markingPoints;

  renderSubPartEditor(qi, pi);
}

/**
 * 添加计算步骤
 */
function qaeAddStep(qi, pi) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;

  const part = qaeQuestions[qi].parts[pi];
  if (!part.steps) part.steps = [];

  part.steps.push({
    label: '',
    expected: '',
    expectedValue: null,
    unit: '',
    tolerance: 0.01,
    marks: 1,
    acceptEquivalent: true
  });

  renderSubPartEditor(qi, pi);
}

/**
 * 编辑计算步骤
 */
function qaeSetStep(qi, pi, si, field, value) {
  if (!qaeQuestions[qi]?.parts?.[pi]?.steps?.[si]) return;

  const step = qaeQuestions[qi].parts[pi].steps[si];
  step[field] = value;

  renderSubPartEditor(qi, pi);
}

/**
 * 删除计算步骤
 */
function qaeDelStep(qi, pi, si) {
  if (!qaeQuestions[qi]?.parts?.[pi]?.steps?.[si]) return;

  qaeQuestions[qi].parts[pi].steps.splice(si, 1);
  renderSubPartEditor(qi, pi);
}

/**
 * 设置表格 JSON
 */
function qaeSetPartTableJSON(qi, pi, rawJSON) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;

  try {
    const table = JSON.parse(rawJSON);
    qaeQuestions[qi].parts[pi].table = table;
    renderSubPartEditor(qi, pi);
  } catch (e) {
    alert('表格 JSON 格式错误: ' + e.message);
  }
}

/**
 * 创建空表格
 */
function qaeCreateEmptyTable(qi, pi) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;

  qaeQuestions[qi].parts[pi].table = {
    columns: ['Column 1', 'Column 2'],
    rows: [
      {
        label: 'Row 1',
        cells: [
          { expected: '', marks: 1 },
          { expected: '', marks: 1 }
        ]
      }
    ]
  };

  renderSubPartEditor(qi, pi);
}

/**
 * 设置规则字段
 */
function qaeSetPartRule(qi, pi, field, value) {
  if (!qaeQuestions[qi]?.parts?.[pi]) return;

  if (!qaeQuestions[qi].parts[pi].rules) {
    qaeQuestions[qi].parts[pi].rules = {
      maxMarks: qaeQuestions[qi].parts[pi].marks,
      mode: 'any_points',
      acceptLogicalAnswer: false,
      ecf: false,
      requireUnit: false,
      noDoubleCounting: true
    };
  }

  qaeQuestions[qi].parts[pi].rules[field] = value;
  renderSubPartEditor(qi, pi);
}

// ==========================================
// UI 渲染函数
// ==========================================

/**
 * 渲染答题类型选择器
 */
function renderAnswerTypeSelector(qi, pi) {
  const part = qaeQuestions[qi]?.parts?.[pi];
  if (!part) return '';

  const types = [
    'point_based',
    'keyword_concept',
    'calculation_steps',
    'table_cells',
    'formula',
    'diagram_label',
    'rubric_based'
  ];

  return `
    <div class="mb-3">
      <label class="text-sm font-bold">答题类型</label>
      <select onchange="qaeSetPartField(${qi}, ${pi}, 'answerType', this.value)"
              class="field w-full">
        <option value="">-- 选择类型 --</option>
        ${types.map(t => `
          <option value="${t}" ${part.answerType === t ? 'selected' : ''}>
            ${t}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

/**
 * 渲染 Point Based 编辑器
 */
function renderPointBasedEditor(qi, pi) {
  const part = qaeQuestions[qi]?.parts?.[pi];
  if (!part) return '';

  const hasOldPoints = part.markingPoints?.length && !part.markingUnits?.length;

  return `
    <div class="bg-gray-50 p-3 rounded mb-3">
      <h4 class="font-bold text-sm mb-2">📝 模型答案</h4>
      <textarea
        class="field w-full h-16"
        onchange="qaeSetPartField(${qi}, ${pi}, 'modelAnswer', this.value)"
        placeholder="输入模型答案...">${part.modelAnswer || ''}</textarea>

      <h4 class="font-bold text-sm mt-3 mb-2">⭐ 标记单位</h4>
      <div id="marking-units-${qi}-${pi}" class="space-y-2">
        ${(part.markingUnits || []).map((unit, ui) => `
          <div class="bg-white p-2 border rounded text-xs">
            <div class="grid grid-cols-3 gap-2 mb-1">
              <input type="text" class="field"
                placeholder="标记点"
                value="${unit.text || ''}"
                onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'text', this.value)">
              <input type="number" class="field"
                placeholder="分数"
                value="${unit.marks || 1}"
                onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'marks', parseInt(this.value))">
              <button onclick="qaeDelMarkingUnit(${qi}, ${pi}, ${ui})"
                class="bg-red-500 text-white px-2 py-1 rounded">删除</button>
            </div>
            <input type="text" class="field w-full text-xs"
              placeholder="别名（逗号分隔）"
              value="${(unit.aliases || []).join(', ')}"
              onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'aliases', this.value.split(',').map(s => s.trim()))">
            <textarea class="field w-full text-xs mt-1" rows="2"
              placeholder="缺失时反馈"
              onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'feedbackIfMissing', this.value)">${unit.feedbackIfMissing || ''}</textarea>
          </div>
        `).join('')}
      </div>

      <button onclick="qaeAddMarkingUnit(${qi}, ${pi})"
        class="bg-blue-600 text-white text-xs px-3 py-1 rounded mt-2">
        + 添加单位
      </button>

      ${hasOldPoints ? `
        <button onclick="qaeConvertPointsToUnits(${qi}, ${pi})"
          class="bg-green-600 text-white text-xs px-3 py-1 rounded mt-2 ml-2">
          ↓ 转换旧标记点
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * 渲染计算步骤编辑器
 */
function renderCalculationStepsEditor(qi, pi) {
  const part = qaeQuestions[qi]?.parts?.[pi];
  if (!part) return '';

  return `
    <div class="bg-gray-50 p-3 rounded mb-3">
      <h4 class="font-bold text-sm mb-2">📐 计算步骤</h4>
      ${(part.steps || []).map((step, si) => `
        <div class="bg-white p-2 border rounded mb-2 text-xs">
          <input type="text" class="field mb-1" placeholder="步骤标签（如 Formula）"
            value="${step.label || ''}"
            onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'label', this.value)">
          <input type="text" class="field mb-1" placeholder="预期答案"
            value="${step.expected || ''}"
            onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'expected', this.value)">
          <input type="text" class="field mb-1" placeholder="单位"
            value="${step.unit || ''}"
            onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'unit', this.value)">
          <input type="number" class="field w-1/4 mb-1" placeholder="分数"
            value="${step.marks || 1}"
            onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'marks', parseInt(this.value))">
          <button onclick="qaeDelStep(${qi}, ${pi}, ${si})"
            class="text-red-600">删除</button>
        </div>
      `).join('')}

      <button onclick="qaeAddStep(${qi}, ${pi})"
        class="bg-blue-600 text-white text-xs px-3 py-1 rounded">
        + 添加步骤
      </button>
    </div>
  `;
}

/**
 * 渲染表格编辑器
 */
function renderTableCellsEditor(qi, pi) {
  const part = qaeQuestions[qi]?.parts?.[pi];
  if (!part) return '';

  const tableJSON = JSON.stringify(part.table || { columns: [], rows: [] }, null, 2);

  return `
    <div class="bg-gray-50 p-3 rounded mb-3">
      <h4 class="font-bold text-sm mb-2">📊 表格 JSON</h4>
      <textarea
        class="field w-full h-32 font-mono text-xs"
        onblur="qaeSetPartTableJSON(${qi}, ${pi}, this.value)">${tableJSON}</textarea>
      <button onclick="qaeCreateEmptyTable(${qi}, ${pi})"
        class="bg-blue-600 text-white text-xs px-3 py-1 rounded mt-2">
        ⊕ 创建空表格
      </button>
    </div>
  `;
}

/**
 * 根据答题类型渲染相应编辑器
 */
function renderAnswerTypeEditor(qi, pi) {
  const part = qaeQuestions[qi]?.parts?.[pi];
  const type = getPartAnswerType(part);

  let editor = '';

  if (type === 'point_based' || type === 'keyword_concept') {
    editor = renderPointBasedEditor(qi, pi);
  } else if (type === 'calculation_steps') {
    editor = renderCalculationStepsEditor(qi, pi);
  } else if (type === 'table_cells') {
    editor = renderTableCellsEditor(qi, pi);
  } else if (type === 'rubric_based') {
    editor = '<div class="bg-gray-50 p-3 rounded mb-3"><p class="text-xs">Rubric 编辑器待实现</p></div>';
  }

  return editor;
}

// ==========================================
// 导入验证
// ==========================================

/**
 * 显示导入验证摘要
 */
function showImportValidationSummary(importedData) {
  const summary = {
    totalQuestions: importedData.length,
    totalMarks: 0,
    incompleteAnswerTypes: 0,
    emptyMarks: 0,
    missingMarkingUnits: 0,
    missingSteps: 0,
    ecfRules: 0,
    warnings: []
  };

  importedData.forEach((q, idx) => {
    const questionMarks = (q.parts || []).reduce((sum, p) => sum + (p.marks || 0), 0);
    summary.totalMarks += questionMarks;

    (q.parts || []).forEach(p => {
      const warnings = getPartCompletenessWarnings(p);
      summary.warnings.push(...warnings.map(w => `Q${q.questionNo}: ${w}`));

      if (!p.answerType) summary.incompleteAnswerTypes++;
      if (!p.marks || p.marks === 0) summary.emptyMarks++;
      if (p.answerType === 'point_based' && !p.markingUnits?.length && !p.markingPoints?.length) {
        summary.missingMarkingUnits++;
      }
      if (p.answerType === 'calculation_steps' && !p.steps?.length) {
        summary.missingSteps++;
      }
      if (p.rules?.ecf) summary.ecfRules++;
    });
  });

  const warningHTML = summary.warnings.length ?
    `<div class="bg-orange-100 border border-orange-400 p-2 rounded mt-2 text-xs">
      <strong>⚠️ 警告：</strong>
      ${summary.warnings.slice(0, 5).map(w => `<div>${w}</div>`).join('')}
      ${summary.warnings.length > 5 ? `<div>... 还有 ${summary.warnings.length - 5} 个警告</div>` : ''}
    </div>` : '';

  const html = `
    <div class="bg-blue-50 border border-blue-200 p-3 rounded text-xs">
      <h3 class="font-bold mb-2">📊 导入摘要</h3>
      <p>✅ ${summary.totalQuestions} 个问题</p>
      <p>✅ 总分：${summary.totalMarks} 分</p>
      ${summary.incompleteAnswerTypes > 0 ? `<p class="text-orange-600">⚠️ ${summary.incompleteAnswerTypes} 个缺少 answerType</p>` : ''}
      ${summary.missingMarkingUnits > 0 ? `<p class="text-orange-600">⚠️ ${summary.missingMarkingUnits} 个缺少标记单位</p>` : ''}
      ${summary.ecfRules > 0 ? `<p class="text-blue-600">ℹ️ ${summary.ecfRules} 个有 ECF 规则</p>` : ''}
      ${warningHTML}
    </div>
  `;

  document.getElementById('qae-count').innerHTML = html;
}

// ==========================================
// 导出/保存
// ==========================================

/**
 * 增强 saveQA() 以支持新字段
 * 这个函数应该替换 admin.html 中现有的 saveQA()
 */
async function saveQA_V2() {
  if (!qaeContentId) return;
  const btn = document.getElementById('qae-save-btn');
  btn.textContent = 'Uploading...';
  btn.disabled = true;

  try {
    // 上传图片
    const prefix = `qa-imgs/${qaeContentId}`;
    const uploaded = await uploadQuestionImgs(qaeQuestions, prefix);

    // 准备保存的数据
    const saveData = {
      contentId: qaeContentId,
      questions: uploaded,
      schemaVersion: 2,  // 标记为新版本
      updatedAt: serverTimestamp()
    };

    // 保存
    if (qaeQAId) {
      await updateDoc(doc(db, 'qa', qaeQAId), saveData);
    } else {
      const ref = await addDoc(collection(db, 'qa'), saveData);
      qaeQAId = ref.id;
      await updateDoc(doc(db, 'content', qaeContentId), { qaId: qaeQAId });
    }

    btn.textContent = '✅ 已保存!';
    setTimeout(() => { btn.textContent = '💾 Save'; btn.disabled = false; }, 2000);

  } catch (e) {
    btn.textContent = '💾 Save';
    btn.disabled = false;
    alert('Error: ' + e.message);
  }
}
