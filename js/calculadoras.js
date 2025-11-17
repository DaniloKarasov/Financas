// Formatação e parsing seguros
  const fmt = v => {
    const n = Number(v) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  const parseNum = value => {
    if (value === null || value === undefined || value === '') return 0;
    // Remove espaços, pontos de milhar e transforma vírgula em ponto
    const s = String(value).trim().replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.');
    const n = Number(s);
    return isFinite(n) ? n : 0;
  };

  // Shortcuts
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Aguarda DOM (defensivo; o script já está no fim do body, mas é seguro)
  document.addEventListener('DOMContentLoaded', () => {

    // --------------------------
    // Budget calculator logic
    // --------------------------
    (function budgetModule(){
      const incomeEl = $('#income');
      const fixedTbody = $('#fixed-tbody');
      const varTbody = $('#var-tbody');
      const addFixedBtn = $('#add-fixed');
      const addVarBtn = $('#add-var');
      const calcBtn = $('#calc-budget');
      const resetBtn = $('#reset-budget');
      const exportBtn = $('#export-budget');
      const totalExp = $('#total-exp');
      const balance = $('#balance');
      const percentages = $('#percentages');
      const suggestion = $('#budget-suggestion');

      function createRow(desc = '', value = '') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="row-desc" value="${desc}" placeholder="Ex: Aluguel" aria-label="Descrição da despesa"></td>
          <td><input type="number" class="row-val" min="0" step="0.01" value="${value}" placeholder="0.00" aria-label="Valor da despesa"></td>
          <td><button type="button" class="btn-ghost row-remove">Remover</button></td>
        `;
        tr.querySelector('.row-remove').addEventListener('click', () => tr.remove());
        return tr;
      }

      function initRows(){
        fixedTbody.innerHTML = '';
        varTbody.innerHTML = '';
        fixedTbody.appendChild(createRow('Aluguel', ''));
        varTbody.appendChild(createRow('Supermercado', ''));
      }

      function collectRows(tbody){
        return Array.from(tbody.querySelectorAll('tr')).map(tr => {
          const desc = tr.querySelector('.row-desc').value.trim();
          const val = parseNum(tr.querySelector('.row-val').value);
          return { desc, val };
        }).filter(r => r.desc || r.val > 0);
      }

      function calculate(){
        const income = parseNum(incomeEl.value);
        const fixed = collectRows(fixedTbody);
        const variable = collectRows(varTbody);
        const sumFixed = fixed.reduce((s, i) => s + i.val, 0);
        const sumVar = variable.reduce((s, i) => s + i.val, 0);
        const total = sumFixed + sumVar;
        const bal = Math.round((income - total) * 100) / 100;

        totalExp.textContent = fmt(total);
        balance.textContent = fmt(bal);

        const percentFixed = income ? Math.round((sumFixed / income) * 100) : 0;
        const percentVar = income ? Math.round((sumVar / income) * 100) : 0;
        percentages.innerHTML = `<strong>Fixas:</strong> ${percentFixed}% &nbsp; • &nbsp; <strong>Variáveis:</strong> ${percentVar}%`;

        if (income === 0 && total === 0) {
          suggestion.textContent = '';
        } else if (bal < 0) {
          suggestion.innerHTML = '<span class="error">Atenção: seu orçamento está negativo. Avalie reduzir despesas variáveis ou negociar contas fixas.</span>';
        } else if (income > 0 && bal < income * 0.05) {
          suggestion.innerHTML = '<span class="small muted">Saldo positivo, mas pequeno — considere aumentar a reserva de emergência ou reduzir despesas variáveis.</span>';
        } else {
          suggestion.innerHTML = '<span class="small muted">Saldo saudável — você pode destinar parte para poupança ou objetivos.</span>';
        }

        return { income, fixed, variable, sumFixed, sumVar, total, bal };
      }

      // Eventos
      addFixedBtn.addEventListener('click', () => fixedTbody.appendChild(createRow('', '')));
      addVarBtn.addEventListener('click', () => varTbody.appendChild(createRow('', '')));
      calcBtn.addEventListener('click', calculate);
      resetBtn.addEventListener('click', () => {
        incomeEl.value = '';
        percentages.textContent = '';
        suggestion.textContent = '';
        initRows();
        totalExp.textContent = fmt(0);
        balance.textContent = fmt(0);
      });

      function escapeCSVCell(cell) {
        return `"${String(cell).replace(/"/g, '""')}"`;
      }

      function toCSV(obj){
        const rows = [];
        rows.push(['Tipo','Descrição','Valor']);
        obj.fixed.forEach(f => rows.push(['Fixa', f.desc || '', f.val || 0]));
        obj.variable.forEach(v => rows.push(['Variável', v.desc || '', v.val || 0]));
        rows.push([]);
        rows.push(['Renda', '', obj.income]);
        rows.push(['Total despesas', '', obj.total]);
        rows.push(['Saldo', '', obj.bal]);
        return rows.map(r => r.map(escapeCSVCell).join(',')).join('\r\n');
      }

      exportBtn.addEventListener('click', () => {
        const data = calculate();
        const csv = toCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orcamento_ceilandia.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

      // init
      initRows();
    })();

    // --------------------------
    // Goals calculator logic
    // --------------------------
    (function goalsModule(){
      const totalEl = $('#goal-total');
      const monthsEl = $('#goal-months');
      const currentEl = $('#goal-current');
      const daysSelect = $('#goal-frequency');
      const calcBtn = $('#calc-goal');
      const resetBtn = $('#reset-goal');
      const exportBtn = $('#export-goal');

      const remainingEl = $('#goal-remaining');
      const perMonthEl = $('#save-per-month');
      const perWeekEl = $('#save-per-week');
      const perDayEl = $('#save-per-day');

      function calculate(){
        const total = parseNum(totalEl.value);
        const monthsInput = Math.floor(parseNum(monthsEl.value)) || 0;
        const months = monthsInput > 0 ? monthsInput : 1;
        const current = parseNum(currentEl.value);
        const days = parseInt(daysSelect.value, 10) || 30;
        const need = Math.max(0, total - current);
        const perMonth = months > 0 ? (need / months) : need;
        const perWeek = (need / (months * 4));
        const perDay = (need / (months * days));

        remainingEl.textContent = fmt(need);
        perMonthEl.textContent = fmt(perMonth);
        perWeekEl.textContent = fmt(perWeek);
        perDayEl.textContent = fmt(perDay);

        return { total, current, months, need, perMonth, perWeek, perDay };
      }

      calcBtn.addEventListener('click', calculate);
      resetBtn.addEventListener('click', () => {
        totalEl.value = '';
        monthsEl.value = '';
        currentEl.value = '';
        remainingEl.textContent = fmt(0);
        perMonthEl.textContent = fmt(0);
        perWeekEl.textContent = fmt(0);
        perDayEl.textContent = fmt(0);
      });

      exportBtn.addEventListener('click', () => {
        const data = calculate();
        const rows = [
          ['Campo','Valor'],
          ['Objetivo', data.total || 0],
          ['Valor disponível', data.current || 0],
          ['Faltam (total)', data.need || 0],
          ['Prazo (meses)', data.months || 0],
          ['Salvar por mês', data.perMonth || 0],
          ['Salvar por semana', data.perWeek || 0],
          ['Salvar por dia', data.perDay || 0],
        ];
        const csv = rows.map(r => r.map(escapeCSVCell).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'meta_economia.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

      // helper escape reused
      function escapeCSVCell(cell) {
        return `"${String(cell).replace(/"/g, '""')}"`;
      }
    })();

    // --------------------------
    // Proportion calculator logic
    // --------------------------
    (function propModule(){
      const incomeEl = $('#prop-income');
      const tbody = $('#prop-tbody');
      const addBtn = $('#add-prop');
      const calcBtn = $('#calc-prop');
      const resetBtn = $('#reset-prop');
      const exportBtn = $('#export-prop');
      const barsEl = $('#bars');
      const summaryEl = $('#prop-summary');

      function createRow(cat = '', val = '') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="prop-cat" value="${cat}" placeholder="Ex: Alimentação" aria-label="Categoria"></td>
          <td><input type="number" class="prop-val" min="0" step="0.01" value="${val}" placeholder="0.00" aria-label="Valor da categoria"></td>
          <td><button type="button" class="btn-ghost prop-remove">Remover</button></td>
        `;
        tr.querySelector('.prop-remove').addEventListener('click', () => tr.remove());
        return tr;
      }

      function init(){
        tbody.innerHTML = '';
        tbody.appendChild(createRow('Moradia', ''));
        tbody.appendChild(createRow('Alimentação', ''));
        tbody.appendChild(createRow('Transporte', ''));
      }

      function collect(){
        return Array.from(tbody.querySelectorAll('tr')).map(tr => {
          const cat = tr.querySelector('.prop-cat').value.trim();
          const val = parseNum(tr.querySelector('.prop-val').value);
          return { cat, val };
        }).filter(r => r.cat && r.val > 0);
      }

      function renderBars(items, income){
        barsEl.innerHTML = '';
        const total = items.reduce((s, i) => s + i.val, 0) || 0.0001; // avoid divide by zero
        items.forEach(it => {
          const pct = income ? Math.round((it.val / income) * 100) : Math.round((it.val / total) * 100);
          const row = document.createElement('div');
          row.className = 'bar-row';
          row.innerHTML = `
            <div class="bar-label">${it.cat}</div>
            <div class="bar-visual" aria-hidden="true"><div class="bar-fill" style="width:${Math.min(pct,100)}%"></div></div>
            <div class="bar-percent">${pct}%</div>
          `;
          barsEl.appendChild(row);
        });
      }

      calcBtn.addEventListener('click', () => {
        const income = parseNum(incomeEl.value);
        const items = collect();
        const total = items.reduce((s, i) => s + i.val, 0);
        renderBars(items, income || total);
        summaryEl.textContent = `Total categorias: ${fmt(total)} • Renda: ${fmt(income || 0)}`;
        return { income, items, total };
      });

      addBtn.addEventListener('click', () => tbody.appendChild(createRow('', '')));
      resetBtn.addEventListener('click', () => {
        incomeEl.value = '';
        init();
        barsEl.innerHTML = '';
        summaryEl.textContent = '';
      });

      exportBtn.addEventListener('click', () => {
        const income = parseNum(incomeEl.value);
        const items = collect();
        const rows = [['Categoria','Valor']];
        items.forEach(i => rows.push([i.cat, i.val]));
        rows.push([]);
        rows.push(['Renda', income]);
        const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proporcao_gastos.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

      // init
      init();
    })();

    // Pequenas proteções de acessibilidade
    document.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
        // não sobrescrever comportamento padrão — os botões específicos executam ações
      }
    });

  }); // DOMContentLoaded end