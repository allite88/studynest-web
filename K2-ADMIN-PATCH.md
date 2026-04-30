# K2 Marking Scheme Admin - 集成指南

## 概述
将K2 marking scheme编辑器集成到现有admin.html中，在K2 quiz编辑位置增加功能。

---

## 1. HTML部分 - 在 `<!-- QUIZ EDITOR -->` 后添加

在admin.html中`</div>`（结束quiz-editor）后，添加K2编辑器HTML：

```html
    <!-- K2 MARKING SCHEME EDITOR (replaces content body) -->
    <div id="k2-editor" class="hidden">
      <!-- Header -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <button onclick="closeK2Editor()" class="text-slate-400 hover:text-slate-700 text-sm flex items-center gap-1 transition">← Papers</button>
        <div class="h-4 w-px bg-slate-200"></div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-slate-700" id="k2e-title">K2 Marking Scheme</div>
          <div class="text-xs text-slate-400" id="k2e-subtitle"></div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400" id="k2e-count">0 questions</span>
          <button id="k2e-save-btn" onclick="saveK2Marking()" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition">💾 Save Marking</button>
        </div>
      </div>

      <!-- 2-column: Left Questions, Right Blocks Editor -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- LEFT: Questions List -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="font-semibold text-slate-700 text-sm">Questions</div>
              <div class="flex gap-1">
                <button onclick="openK2ImportJSON()" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-1 rounded-lg transition">📋 Import</button>
                <button onclick="addK2Question()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg transition">+ Q</button>
              </div>
            </div>
            <div id="k2e-questions-list" class="space-y-1 max-h-96 overflow-y-auto"></div>
          </div>
        </div>

        <!-- RIGHT: Question Editor & Blocks -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Question Text -->
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <div class="text-xs font-bold text-slate-500 uppercase mb-2">Question Text</div>
            <div class="mb-2">
              <label class="text-xs cursor-pointer mr-3"><input type="radio" name="k2-lang" value="bm" onchange="switchK2Lang('bm')" checked> BM</label>
              <label class="text-xs cursor-pointer"><input type="radio" name="k2-lang" value="en" onchange="switchK2Lang('en')"> EN</label>
            </div>
            <textarea id="k2-q-text-bm" class="field" rows="2" placeholder="Soalan dalam BM..."></textarea>
            <textarea id="k2-q-text-en" class="field" rows="2" placeholder="Question in EN..." style="display:none; margin-top:8px;"></textarea>
          </div>

          <!-- Total Marks -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white rounded-xl border border-slate-200 p-4">
              <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Total Marks</label>
              <input type="number" id="k2-q-total-marks" value="20" class="field" style="font-size:12px;">
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4">
              <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Passing Mark</label>
              <input type="number" id="k2-q-passing-mark" value="10" class="field" style="font-size:12px;">
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4">
              <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Status</label>
              <select id="k2-q-status" class="field" style="font-size:12px;">
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <!-- Blocks -->
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="font-semibold text-slate-700 text-sm">Answer Blocks</div>
              <button onclick="addK2Block()" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">+ Block</button>
            </div>
            <div id="k2e-blocks-list" class="space-y-2"></div>
          </div>
        </div>
      </div>
    </div>
```

---

## 2. JavaScript部分 - 添加到现有JavaScript中

在admin.html的`<script>`标签内，添加以下函数（放在现有的quiz editor函数之后）：

```javascript
// ── K2 MARKING SCHEME EDITOR ──────────────────────────────────
let k2eContentId = null;
let k2eSlotKey = null;
let k2eMarking = null;
let k2eSelectedQuestionIndex = null;
let k2eQuestions = [];

window.openK2Editor = async (contentId, slotKey) => {
  k2eContentId = contentId;
  k2eSlotKey = slotKey;
  k2eSelectedQuestionIndex = null;
  k2eQuestions = [];
  k2eMarking = null;

  // Try to load existing marking scheme
  try {
    const snap = await getDoc(doc(db, 'k2-marking-schemes', 'K2', `${contentId}-${slotKey}`));
    if (snap.exists()) {
      k2eMarking = snap.data();
      k2eQuestions = k2eMarking.questions || [];
    }
  } catch(e) {
    console.log('No existing K2 marking');
  }

  const contentSnap = await getDoc(doc(db, 'content', contentId));
  const cd = contentSnap.exists() ? contentSnap.data() : {};

  document.getElementById('k2e-title').textContent = `${cd.title || 'Paper'} — K2 Marking Scheme`;
  document.getElementById('k2e-subtitle').textContent = `${cd.subject || ''} · ${cd.year || ''}`;

  document.getElementById('sec-content-body').classList.add('hidden');
  document.getElementById('k2-editor').classList.remove('hidden');
  
  renderK2QuestionsList();
};

window.closeK2Editor = () => {
  document.getElementById('k2-editor').classList.add('hidden');
  document.getElementById('sec-content-body').classList.remove('hidden');
  k2eContentId = null;
  k2eSlotKey = null;
  k2eQuestions = [];
  loadContent();
};

window.addK2Question = () => {
  const no = k2eQuestions.length + 1;
  k2eQuestions.push({
    id: `q-${Date.now()}`,
    questionNo: no,
    questionBM: '',
    questionEN: '',
    totalMarks: 20,
    passingMark: 10,
    paper: 'K2',
    blocks: [],
    status: 'draft'
  });
  renderK2QuestionsList();
  selectK2Question(k2eQuestions.length - 1);
};

window.selectK2Question = (index) => {
  k2eSelectedQuestionIndex = index;
  renderK2QuestionsList();
  renderK2Editor();
};

window.deleteK2Question = () => {
  if (k2eSelectedQuestionIndex === null) return;
  if (!confirm('Delete this question?')) return;
  k2eQuestions.splice(k2eSelectedQuestionIndex, 1);
  k2eSelectedQuestionIndex = null;
  renderK2QuestionsList();
  renderK2Editor();
};

function renderK2QuestionsList() {
  const list = document.getElementById('k2e-questions-list');
  document.getElementById('k2e-count').textContent = `${k2eQuestions.length} questions`;
  
  if (!k2eQuestions.length) {
    list.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">No questions</div>';
    return;
  }

  list.innerHTML = k2eQuestions.map((q, i) => `
    <div class="p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer transition
      ${i === k2eSelectedQuestionIndex ? 'ring-2 ring-indigo-500 border-indigo-500' : 'hover:border-indigo-200'}"
      onclick="selectK2Question(${i})">
      <div class="font-bold text-sm text-slate-700">Q${q.questionNo}</div>
      <div class="text-xs text-slate-400 truncate mt-0.5">${(q.questionBM || '(empty)').substring(0, 60)}</div>
      <div class="text-xs text-slate-500 mt-1">${q.blocks?.length || 0} blocks</div>
    </div>
  `).join('');
}

function renderK2Editor() {
  if (k2eSelectedQuestionIndex === null) {
    document.getElementById('k2-q-text-bm').value = '';
    document.getElementById('k2-q-text-en').value = '';
    document.getElementById('k2-q-total-marks').value = 20;
    document.getElementById('k2-q-passing-mark').value = 10;
    document.getElementById('k2e-blocks-list').innerHTML = '<div class="text-xs text-slate-400">Select a question</div>';
    return;
  }

  const q = k2eQuestions[k2eSelectedQuestionIndex];
  document.getElementById('k2-q-text-bm').value = q.questionBM || '';
  document.getElementById('k2-q-text-en').value = q.questionEN || '';
  document.getElementById('k2-q-total-marks').value = q.totalMarks || 20;
  document.getElementById('k2-q-passing-mark').value = q.passingMark || 10;
  document.getElementById('k2-q-status').value = q.status || 'draft';

  renderK2BlocksList();
}

function renderK2BlocksList() {
  const q = k2eQuestions[k2eSelectedQuestionIndex];
  const list = document.getElementById('k2e-blocks-list');

  if (!q.blocks?.length) {
    list.innerHTML = '<div class="text-xs text-slate-400 italic">No blocks. Click + Block to add.</div>';
    return;
  }

  list.innerHTML = q.blocks.map((b, i) => `
    <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-indigo-300 transition flex items-center justify-between"
      onclick="editK2Block(${i})">
      <div class="flex-1">
        <span class="text-xs font-bold text-indigo-600">${b.type.replace('-', ' ')}</span>
        ${b.title ? `<div class="text-sm font-medium text-slate-700 mt-0.5">${escHtml(b.title)}</div>` : ''}
      </div>
      <button onclick="event.stopPropagation(); deleteK2Block(${i})" class="text-xs text-red-500 hover:text-red-700 px-2 py-1">×</button>
    </div>
  `).join('');
}

window.addK2Block = () => {
  if (k2eSelectedQuestionIndex === null) { alert('Select a question first'); return; }
  const block = {
    id: `block-${Date.now()}`,
    type: 'answer-section',
    language: 'bm',
    title: '',
    content: []
  };
  k2eQuestions[k2eSelectedQuestionIndex].blocks.push(block);
  renderK2BlocksList();
};

window.editK2Block = (index) => {
  alert('Block editing coming soon');
  // TODO: Open block editor modal
};

window.deleteK2Block = (index) => {
  if (!confirm('Delete this block?')) return;
  k2eQuestions[k2eSelectedQuestionIndex].blocks.splice(index, 1);
  renderK2BlocksList();
};

window.switchK2Lang = (lang) => {
  document.getElementById('k2-q-text-bm').style.display = lang === 'bm' ? 'block' : 'none';
  document.getElementById('k2-q-text-en').style.display = lang === 'en' ? 'block' : 'none';
};

window.saveK2Marking = async () => {
  if (k2eSelectedQuestionIndex !== null) {
    const q = k2eQuestions[k2eSelectedQuestionIndex];
    q.questionBM = document.getElementById('k2-q-text-bm').value;
    q.questionEN = document.getElementById('k2-q-text-en').value;
    q.totalMarks = parseInt(document.getElementById('k2-q-total-marks').value) || 20;
    q.passingMark = parseInt(document.getElementById('k2-q-passing-mark').value) || 10;
    q.status = document.getElementById('k2-q-status').value;
  }

  const btn = document.getElementById('k2e-save-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const docData = {
      contentId: k2eContentId,
      slotKey: k2eSlotKey,
      questions: k2eQuestions,
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'k2-marking-schemes', 'K2', `${k2eContentId}-${k2eSlotKey}`), docData, { merge: true });

    btn.textContent = '✅ Saved!';
    setTimeout(() => {
      btn.textContent = '💾 Save Marking';
      btn.disabled = false;
    }, 2000);
  } catch(e) {
    alert('Error: ' + e.message);
    btn.textContent = '💾 Save Marking';
    btn.disabled = false;
  }
};

window.openK2ImportJSON = () => {
  const json = prompt('Paste Gemini JSON output (Question):');
  if (!json) return;
  try {
    const data = JSON.parse(json);
    const arr = Array.isArray(data) ? data : [data];
    arr.forEach(item => {
      const q = {
        id: `q-${Date.now()}-${Math.random()}`,
        questionNo: item.questionNo || k2eQuestions.length + 1,
        questionBM: item.questionBM || '',
        questionEN: item.questionEN || '',
        totalMarks: item.totalMarks || 20,
        passingMark: item.passingMark || 10,
        paper: 'K2',
        blocks: item.blocks || [],
        status: 'draft'
      };
      const idx = k2eQuestions.findIndex(x => x.questionNo === q.questionNo);
      if (idx >= 0) {
        k2eQuestions[idx] = q;
      } else {
        k2eQuestions.push(q);
      }
    });
    k2eQuestions.sort((a, b) => (a.questionNo || 0) - (b.questionNo || 0));
    renderK2QuestionsList();
    alert(`✅ Imported ${arr.length} question(s)`);
  } catch(e) {
    alert('❌ Invalid JSON: ' + e.message);
  }
};
```

---

## 3. 在现有HTML中修改按钮处理

找到K2按钮代码（大约在第715行）：

**原代码：**
```javascript
<button onclick="openQAEditor('${d.id}','${d.qaId||''}')"
  class="text-xs px-2.5 py-1 rounded-lg font-semibold transition ${d.qaId ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
  📝 K2${d.qaId ? ' ✓' : ' (setup)'}
</button>
```

**修改为：**
```javascript
<button onclick="openK2Editor('${d.id}','k2')"
  class="text-xs px-2.5 py-1 rounded-lg font-semibold transition ${d.qaId ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
  📝 K2${d.qaId ? ' ✓' : ' (setup)'}
</button>
```

---

## 4. Firebase Firestore集合结构

```
firestore:
  k2-marking-schemes/
    K2/
      {contentId}-{slotKey}/
        - contentId: string
        - slotKey: "k2"
        - questions: array
          ├─ id, questionNo, questionBM, questionEN
          ├─ totalMarks, passingMark, paper, status
          └─ blocks: array
        - updatedAt: timestamp
```

---

## 5. 下一步功能

1. **Block编辑modal** - 支持编辑answer-section, alternative, common-error
2. **Marking规则编辑** - points-allocation, flexible-accept, ecf, banding
3. **学生预览** - k2-view.html显示标准答案
4. **批量导入** - 支持多个问题一起导入

---

## 使用步骤

1. ✅ 选择试卷 → "Add"
2. ✅ 点击K2按钮 → 打开K2编辑器
3. ✅ 粘贴Gemini JSON → 导入问题
4. ✅ 编辑blocks → 保存到Firebase
5. ⏳ 学生通过k2-view.html查看答案
