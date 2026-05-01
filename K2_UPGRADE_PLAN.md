# 🎯 K2 Marking Builder 升级计划

## 项目目标
升级现有 QA 编辑器（admin.html）和学生页面（qa.html），支持多种答题类型和灵活的标记方案，同时完全兼容现有数据。

---

## 📋 分阶段实施计划

### 🔴 第 1 阶段：数据模型和向后兼容性（2-3 天）

**目标**: 确保新旧数据能共存

- [ ] **更新 Firestore 数据结构**
  - 在 qa 集合中引入 schemaVersion: 2
  - 为旧数据隐式 schemaVersion: 1
  - 创建迁移工具（不自动运行，手动触发）

- [ ] **创建辅助函数** (在 admin.html 中添加)
  ```javascript
  // 检测数据版本
  function getSchemaVersion(question) {
    return question.schemaVersion || 1;
  }
  
  // 获取答题类型
  function getPartAnswerType(part) {
    if (part.answerType) return part.answerType;
    if (part.markingUnits?.length) return 'point_based';
    if (part.steps?.length) return 'calculation_steps';
    if (part.table) return 'table_cells';
    if (part.rubric) return 'rubric_based';
    return 'point_based'; // 默认
  }
  
  // 检查完整性
  function getPartCompletenessWarnings(part) {
    const warnings = [];
    const type = getPartAnswerType(part);
    
    if (!part.marks || part.marks <= 0) {
      warnings.push('缺少 marks');
    }
    if (!part.answerType) {
      warnings.push('未设置 answerType');
    }
    
    if (type === 'point_based' && !part.markingUnits?.length && !part.markingPoints?.length) {
      warnings.push('无标记单位或标记点');
    }
    if (type === 'calculation_steps' && !part.steps?.length) {
      warnings.push('无计算步骤');
    }
    if (type === 'table_cells' && !part.table?.rows?.length) {
      warnings.push('表格无行');
    }
    
    return warnings;
  }
  ```

---

### 🟡 第 2 阶段：Admin UI 更新（3-4 天）

**目标**: 升级 admin.html 的 QA 编辑器

- [ ] **重命名 UI 标签**
  - "Q&A Editor" → "K2 Marking Builder"
  - 保留函数名称不变（安全）

- [ ] **增强导入功能** (修改 doImportJSON)
  ```javascript
  // 支持 schemaVersion 2
  function doImportJSON() {
    const input = document.getElementById('qae-import-input');
    try {
      const json = JSON.parse(input.value);
      const data = json.questions || (Array.isArray(json) ? json : [json]);
      
      data.forEach((q, idx) => {
        const qi = idx;
        qaeQuestions[qi] = qaeQuestions[qi] || {};
        const existing = qaeQuestions[qi];
        
        // 合并，不覆盖
        qaeQuestions[qi] = {
          ...existing,
          ...q,
          qImgs: existing.qImgs || q.qImgs || [],
          // 保留已有的 form/bab
          form: existing.form || q.form,
          bab: existing.bab || q.bab,
          // 新字段
          schemaVersion: q.schemaVersion || 2,
          parts: mergePartsByIndex(existing.parts || [], q.parts || [])
        };
      });
      
      showImportValidationSummary(data);
      renderQAList();
    } catch (e) {
      alert('导入失败: ' + e.message);
    }
  }
  ```

- [ ] **导入验证摘要**
  ```javascript
  function showImportValidationSummary(importedData) {
    const summary = {
      totalQuestions: importedData.length,
      totalMarks: importedData.reduce((sum, q) => 
        sum + (q.parts || []).reduce((s, p) => s + (p.marks || 0), 0), 0),
      incompleteAnswerTypes: 0,
      emptyMarks: 0,
      missingMarkingUnits: 0,
      ecfRules: 0
    };
    
    importedData.forEach(q => {
      (q.parts || []).forEach(p => {
        if (!p.answerType) summary.incompleteAnswerTypes++;
        if (!p.marks || p.marks === 0) summary.emptyMarks++;
        if (p.answerType === 'point_based' && !p.markingUnits?.length && !p.markingPoints?.length) {
          summary.missingMarkingUnits++;
        }
        if (p.rules?.ecf) summary.ecfRules++;
      });
    });
    
    document.getElementById('qae-count').innerHTML = `
      <div class="bg-blue-100 p-3 rounded text-xs">
        <p>📊 导入摘要：</p>
        <p>• ${summary.totalQuestions} 个问题</p>
        <p>• 总分：${summary.totalMarks} 分</p>
        ${summary.incompleteAnswerTypes > 0 ? `<p class="text-orange-600">⚠️ ${summary.incompleteAnswerTypes} 个缺少 answerType</p>` : ''}
        ${summary.missingMarkingUnits > 0 ? `<p class="text-orange-600">⚠️ ${summary.missingMarkingUnits} 个缺少标记单位</p>` : ''}
      </div>
    `;
  }
  ```

- [ ] **问题卡片显示答题类型**
  ```javascript
  function renderQAList() {
    // 更新卡片显示
    const cards = qaeQuestions.map((q, qi) => {
      const answerTypes = new Set();
      const totalMarks = (q.parts || []).reduce((sum, p) => sum + (p.marks || 0), 0);
      const warnings = [];
      
      (q.parts || []).forEach(p => {
        answerTypes.add(getPartAnswerType(p));
        warnings.push(...getPartCompletenessWarnings(p));
      });
      
      return `
        <div class="border rounded p-3 mb-2 ${warnings.length > 0 ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}">
          <div class="flex justify-between items-start">
            <div>
              <strong>Q${q.questionNo}</strong>
              <span class="text-xs text-gray-500 ml-2">${q.form} / ${q.bab}</span>
            </div>
            <span class="text-sm font-bold">${totalMarks}分</span>
          </div>
          <div class="text-xs text-gray-600 mt-1">
            ${q.parts?.length || 0} 个子部分
          </div>
          <div class="text-xs mt-1 space-x-1">
            ${Array.from(answerTypes).map(t => `<span class="bg-blue-100 px-2 py-1 rounded">${t}</span>`).join('')}
          </div>
          ${warnings.length > 0 ? `
            <div class="text-xs text-orange-600 mt-2">
              ${warnings.map(w => `⚠️ ${w}`).join('<br>')}
            </div>
          ` : ''}
          <button onclick="qaeExpandQuestion(${qi})" class="mt-2 text-blue-600 text-xs">编辑</button>
        </div>
      `;
    }).join('');
    
    document.getElementById('qae-list').innerHTML = cards;
  }
  ```

---

### 🟢 第 3 阶段：子部分编辑器（4-5 天）

**目标**: 为每种答题类型添加编辑器

- [ ] **答题类型选择器**
  ```javascript
  function renderSubPartAnswerTypeSelector(qi, pi) {
    const part = qaeQuestions[qi].parts[pi];
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
          ${types.map(t => `<option value="${t}" ${part.answerType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    `;
  }
  ```

- [ ] **Point Based / Keyword Concept 编辑器**
  ```javascript
  function renderPointBasedEditor(qi, pi) {
    const part = qaeQuestions[qi].parts[pi];
    
    return `
      <div class="bg-gray-50 p-3 rounded mb-3">
        <h4 class="font-bold text-sm mb-2">模型答案</h4>
        <textarea 
          class="field w-full h-20" 
          onchange="qaeSetPartField(${qi}, ${pi}, 'modelAnswer', this.value)"
          placeholder="输入模型答案...">${part.modelAnswer || ''}</textarea>
        
        <h4 class="font-bold text-sm mt-3 mb-2">标记单位</h4>
        <div id="marking-units-${qi}-${pi}" class="space-y-2">
          ${(part.markingUnits || []).map((unit, ui) => `
            <div class="bg-white p-2 border rounded">
              <input type="text" class="field w-full text-xs mb-1" 
                placeholder="标记点" 
                value="${unit.text || ''}"
                onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'text', this.value)">
              <input type="number" class="field w-1/4 text-xs" 
                placeholder="分数" 
                value="${unit.marks || 1}"
                onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'marks', parseInt(this.value))">
              <input type="text" class="field w-full text-xs mt-1" 
                placeholder="别名（逗号分隔）" 
                value="${(unit.aliases || []).join(', ')}"
                onchange="qaeSetMarkingUnit(${qi}, ${pi}, ${ui}, 'aliases', this.value.split(',').map(s => s.trim()))">
              <button onclick="qaeDelMarkingUnit(${qi}, ${pi}, ${ui})" 
                class="text-red-600 text-xs mt-1">删除</button>
            </div>
          `).join('')}
        </div>
        
        <button onclick="qaeAddMarkingUnit(${qi}, ${pi})" class="text-blue-600 text-xs mt-2">
          + 添加标记单位
        </button>
        
        ${!part.markingUnits?.length && part.markingPoints?.length ? `
          <button onclick="qaeConvertPointsToUnits(${qi}, ${pi})" 
            class="text-green-600 text-xs mt-2 ml-2">
            ↓ 转换 markingPoints 到单位
          </button>
        ` : ''}
      </div>
    `;
  }
  ```

- [ ] **Calculation Steps 编辑器**
  ```javascript
  function renderCalculationStepsEditor(qi, pi) {
    const part = qaeQuestions[qi].parts[pi];
    
    return `
      <div class="bg-gray-50 p-3 rounded mb-3">
        <h4 class="font-bold text-sm mb-2">计算步骤</h4>
        ${(part.steps || []).map((step, si) => `
          <div class="bg-white p-2 border rounded mb-2">
            <input type="text" class="field text-xs mb-1" 
              placeholder="步骤标签（如 Formula）" 
              value="${step.label || ''}"
              onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'label', this.value)">
            <input type="text" class="field text-xs mb-1" 
              placeholder="预期答案" 
              value="${step.expected || ''}"
              onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'expected', this.value)">
            <input type="number" class="field text-xs mb-1" 
              placeholder="分数" 
              value="${step.marks || 1}"
              onchange="qaeSetStep(${qi}, ${pi}, ${si}, 'marks', parseInt(this.value))">
            <button onclick="qaeDelStep(${qi}, ${pi}, ${si})" 
              class="text-red-600 text-xs">删除</button>
          </div>
        `).join('')}
        <button onclick="qaeAddStep(${qi}, ${pi})" class="text-blue-600 text-xs">
          + 添加步骤
        </button>
      </div>
    `;
  }
  ```

- [ ] **Table Cells 编辑器**
  ```javascript
  function renderTableCellsEditor(qi, pi) {
    const part = qaeQuestions[qi].parts[pi];
    const tableJSON = JSON.stringify(part.table || { columns: [], rows: [] }, null, 2);
    
    return `
      <div class="bg-gray-50 p-3 rounded mb-3">
        <h4 class="font-bold text-sm mb-2">表格 JSON</h4>
        <textarea 
          class="field w-full h-32 font-mono text-xs"
          onblur="qaeSetPartTableJSON(${qi}, ${pi}, this.value)">${tableJSON}</textarea>
        <button onclick="qaeCreateEmptyTable(${qi}, ${pi})" class="text-blue-600 text-xs mt-2">
          ⊕ 创建空表格
        </button>
      </div>
    `;
  }
  ```

---

### 🟣 第 4 阶段：qa.html 学生页面更新（3-4 天）

**目标**: 支持新的答题类型显示和评分

- [ ] **更新 renderPart() 支持新类型**
  ```javascript
  function renderPart(q, p, pi) {
    const type = getPartAnswerType(p);
    let answerDisplay = '';
    
    if (type === 'point_based' || type === 'keyword_concept') {
      if (p.markingUnits?.length) {
        answerDisplay = `
          <div class="marking-units">
            <h5>标记单位</h5>
            ${p.markingUnits.map((unit, ui) => `
              <div class="unit">
                <strong>${unit.text}</strong> (${unit.marks} 分)
                ${unit.aliases?.length ? `<span class="text-xs text-gray-500">别名: ${unit.aliases.join(', ')}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      } else if (p.markingPoints?.length) {
        // 旧格式
        answerDisplay = `<ul>${p.markingPoints.map(mp => `<li>${mp}</li>`).join('')}</ul>`;
      }
      
      if (p.modelAnswer) {
        answerDisplay += `<div class="model-answer"><h5>模型答案</h5><p>${p.modelAnswer}</p></div>`;
      }
    } else if (type === 'calculation_steps') {
      answerDisplay = `
        <div class="steps">
          <h5>计算步骤</h5>
          ${p.steps?.map(step => `
            <div class="step">
              <strong>${step.label}:</strong> ${step.expected} (${step.marks} 分)
            </div>
          `).join('')}
        </div>
      `;
    } else if (type === 'table_cells') {
      answerDisplay = `<div class="table-answer">${JSON.stringify(p.table, null, 2)}</div>`;
    }
    
    return `
      <div class="part">
        <h4>(${p.part || 'a'}) ${p.marks} 分</h4>
        ${answerDisplay}
      </div>
    `;
  }
  ```

- [ ] **更新 checkAnswer() 支持自动评分**
  ```javascript
  function checkAnswer(qi, pi, studentAnswer) {
    const q = qaeLoadedQuestions[qi];
    const p = q?.parts?.[pi];
    if (!p) return null;
    
    const type = getPartAnswerType(p);
    
    if (type === 'point_based' || type === 'keyword_concept') {
      return scorePointBased(p, studentAnswer);
    } else if (type === 'calculation_steps') {
      return scoreCalculationSteps(p, studentAnswer);
    } else {
      return {
        score: null,
        message: '自动评分暂不支持此类型。请对比标记方案。',
        maxMarks: p.marks
      };
    }
  }
  
  function scorePointBased(part, answer) {
    let score = 0;
    const hitUnits = [];
    const missedUnits = [];
    
    (part.markingUnits || []).forEach(unit => {
      const patterns = [unit.text, ...(unit.aliases || [])];
      const hit = patterns.some(pattern => 
        answer.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (hit) {
        score += unit.marks;
        hitUnits.push(unit.text);
      } else {
        missedUnits.push({ text: unit.text, feedback: unit.feedbackIfMissing });
      }
    });
    
    return {
      score,
      maxMarks: part.marks,
      hitUnits,
      missedUnits,
      message: `估计得分: ${score}/${part.marks}`
    };
  }
  ```

---

### 🔵 第 5 阶段：测试和部署（2-3 天）

**目标**: 验证所有功能

- [ ] **向后兼容性测试**
  ```
  ✅ 旧 QA 文档仍可显示
  ✅ 旧 JSON 导入仍有效
  ✅ K1 Quiz 编辑器不受影响
  ```

- [ ] **新功能测试**
  ```
  ✅ 导入 Gemini JSON（带 answerType）
  ✅ 编辑 markingUnits
  ✅ qa.html 显示新类型
  ✅ checkAnswer() 工作正常
  ```

- [ ] **部署**
  ```bash
  git add admin.html qa.html K2_UPGRADE_PLAN.md
  git commit -m "feat: K2 Marking Builder - multi-type support with backward compatibility"
  git push origin main
  ```

---

## 📊 关键函数清单

| 函数 | 位置 | 用途 |
|------|------|------|
| `getSchemaVersion()` | admin.html | 检测数据版本 |
| `getPartAnswerType()` | admin.html, qa.html | 获取答题类型 |
| `getPartCompletenessWarnings()` | admin.html | 检查完整性 |
| `qaeSetPartField()` | admin.html | 更新字段 |
| `qaeAddMarkingUnit()` | admin.html | 添加标记单位 |
| `qaeSetMarkingUnit()` | admin.html | 编辑标记单位 |
| `qaeConvertPointsToUnits()` | admin.html | 转换旧格式 |
| `scorePointBased()` | qa.html | 评分逻辑 |
| `renderPointBasedEditor()` | admin.html | UI 编辑器 |

---

## ⚠️ 关键注意事项

1. **永不删除旧字段** - markingPoints, answer 保留以兼容
2. **保留图片** - 导入时不覆盖 qImgs
3. **保留元数据** - form, bab 不因导入而改变
4. **增量合并** - 新字段和旧字段共存

---

**预计总耗时**: 12-15 天（分散工作）

**风险等级**: 中等（充分的向后兼容性设计）

**验收标准**: 所有旧数据继续工作 + 新数据完全支持
