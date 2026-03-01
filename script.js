document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calc-form');
  const calcBtn = document.getElementById('calc-button');
  const clearBtn = document.getElementById('clear-button');

  // AI Inputs & Buttons
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  const apiKeyStatus = document.getElementById('api-key-status');
  const pdfUpload = document.getElementById('pdf-upload');
  const pdfUrlInput = document.getElementById('pdf-url-input');
  const fetchPdfBtn = document.getElementById('fetch-pdf-btn');
  const fileNameDisplay = document.getElementById('file-name-display');
  const loadingArea = document.getElementById('loading-area');
  const loadingText = document.getElementById('loading-text');

  // 1. Storage Handling for API Key
  const STORAGE_KEY = 'invest_analyzer_gemini_key';

  const loadApiKey = () => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      apiKeyInput.value = savedKey;
      showApiStatus(true);
    }
  };

  const saveApiKey = () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
      showApiStatus(true);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      showApiStatus(false);
    }
  };

  const showApiStatus = (success, message = "✅ 保存済") => {
    apiKeyStatus.textContent = message;
    apiKeyStatus.className = `status-text ${success ? '' : 'error'}`;
    apiKeyStatus.classList.remove('hidden');
    setTimeout(() => {
      if (success) apiKeyStatus.classList.add('hidden');
    }, 3000);
  };

  saveApiKeyBtn.addEventListener('click', saveApiKey);
  loadApiKey(); // Initialize on load

  // Format numbers nicely
  const formatNum = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatPercent = (percent) => {
    if (percent === null || percent === undefined || isNaN(percent) || !isFinite(percent)) return "N/A";
    return formatNum(percent, 2) + " %";
  };

  const formatTimes = (times) => {
    if (times === null || times === undefined || isNaN(times) || !isFinite(times)) return "N/A";
    return formatNum(times, 2) + " 倍";
  };

  const getVal = (id) => {
    const v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? null : v;
  };

  const updateDisplay = (id, value, fallback = "--") => {
    const el = document.getElementById(id);
    if (!el) return;

    if (value === "N/A" || value == null) {
      el.textContent = fallback;
    } else {
      el.textContent = value;

      // Add flash animation class gently
      el.classList.remove('flash-update');
      // Trigger reflow
      void el.offsetWidth;
      el.classList.add('flash-update');
    }
  };

  const calculate = () => {
    // 1. 各種数値の取得
    const sales = getVal('sales');
    const operatingIncome = getVal('operatingIncome');
    const netIncome = getVal('netIncome');

    const totalAssets = getVal('totalAssets');
    const equity = getVal('equity');
    const currentAssets = getVal('currentAssets');
    const currentLiabilities = getVal('currentLiabilities');
    const totalLiabilities = getVal('totalLiabilities');
    const investmentSecurities = getVal('investmentSecurities') || 0; // 空の場合は0

    const stockPrice = getVal('stockPrice');
    const sharesOutstanding = getVal('sharesOutstanding');
    const interestRate = getVal('interestRate') || 1.0;

    // 時価総額の自動計算 = (株価[円] × 発行済株式数[万株] × 10,000) / 1,000,000
    // => 株価 × 株式数(万株) / 100 = 百万円単位
    const marketCap = (stockPrice && sharesOutstanding) ? (stockPrice * sharesOutstanding) / 100 : null;

    // 2. 指標の計算
    // 収益性・安定性
    const operatingMargin = (sales && operatingIncome) ? (operatingIncome / sales) * 100 : null;
    const roe = (netIncome && equity) ? (netIncome / equity) * 100 : null;
    const equityRatio = (equity && totalAssets) ? (equity / totalAssets) * 100 : null;
    const currentRatio = (currentAssets && currentLiabilities) ? (currentAssets / currentLiabilities) * 100 : null;

    // 1株あたり指標の計算
    // 万株 * 1万 = 株数。利益(百万円) * 100万 = 円。 => (利益 * 100万) / (万株 * 1万) = 利益 * 100 / 万株
    const eps = (netIncome !== null && sharesOutstanding) ? (netIncome * 100 / sharesOutstanding) : null;
    const bps = (equity !== null && sharesOutstanding) ? (equity * 100 / sharesOutstanding) : null;

    // バリュエーション
    const psr = (marketCap && sales) ? (marketCap / sales) : null;
    const pbr = (stockPrice && bps) ? (stockPrice / bps) : null;
    const per = (stockPrice && eps) ? (stockPrice / eps) : null;

    // ネットキャッシュ・高度分析
    let netCashRatio = null;
    let cnPer = null;
    let growthRate = null;

    if (currentAssets !== null && totalLiabilities !== null && marketCap !== null) {
      // ネットキャッシュ比率 = （流動資産＋投資有価証券×0.7-負債）/時価総額（在庫は除外）
      const netCashValue = currentAssets + (investmentSecurities * 0.7) - totalLiabilities;
      const rawNetCashRatio = netCashValue / marketCap;
      netCashRatio = rawNetCashRatio * 100;

      if (per !== null) {
        // キャッシュニュートラルPER
        cnPer = (1 - rawNetCashRatio) * per;

        // 想定利益成長率
        const rateDecimal = interestRate / 100;
        if (cnPer !== 0) {
          const rawGrowth = ((cnPer - 1) * rateDecimal - 1) / cnPer;
          growthRate = rawGrowth * 100;
        }
      }
    }

    // 3. 結果の表示
    updateDisplay('res-operatingMargin', formatPercent(operatingMargin));
    updateDisplay('res-roe', formatPercent(roe));
    updateDisplay('res-equityRatio', formatPercent(equityRatio));
    updateDisplay('res-currentRatio', formatPercent(currentRatio));

    updateDisplay('res-marketCap', formatNum(marketCap, 0)); // 小数点以下なし
    updateDisplay('res-psr', formatTimes(psr));
    updateDisplay('res-pbr', formatTimes(pbr));
    updateDisplay('res-per', formatTimes(per));

    updateDisplay('res-netCashRatio', formatPercent(netCashRatio));
    updateDisplay('res-cnPer', formatTimes(cnPer));
    updateDisplay('res-growthRate', formatPercent(growthRate));
  };

  calcBtn.addEventListener('click', () => {
    // Calculate and add a subtle ripple or class
    calculate();
  });

  clearBtn.addEventListener('click', () => {
    // Reset forms
    document.querySelectorAll('#calc-form input[type="number"]').forEach(input => {
      // Default value or empty
      if (input.id === 'investmentSecurities') {
        input.value = "0";
      } else if (input.id === 'interestRate') {
        input.value = "1.0";
      } else {
        input.value = "";
      }
    });

    // Reset results manually (calculate will result in nulls, triggering fallbacks)
    calculate();
  });

  // Enter keys in inputs trigger calc
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      calculate();
    }
  });

  // 4. PDF.js Document parsing
  const extractTextFromPdfBuffer = async (arrayBuffer) => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      // 貸借対照表のページ（大体5〜10ページ目）を確実に含めるため、15ページまで抽出する
      const maxPages = Math.min(pdf.numPages, 15);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (error) {
      console.error("PDF Parse Error:", error);
      throw new Error("PDFの解析に失敗しました。ファイルが暗号化されているか破損している可能性があります。");
    }
  };

  // 5. Gemini API Call
  const analyzeWithGemini = async (text, apiKey) => {
    const prompt = `
あなたは優秀な財務アナリストです。
以下の企業決算短信のテキストデータから財務数値を抽出し、必ず指定されたJSON形式**のみ**を出力してください。
マークダウンブロック（\`\`\`json など）は一切含めないでください。直接 {\"sales\": ...} というJSON文字列だけを返してください。

【重要な抽出ルール】
1. 単位: 数値はすべて「百万円」単位、株式数は「万株」単位に換算してください（例: テキスト上に「123億円」「12,300百万円」とあれば「12300」として出力）。見つからない場合は null にしてください。
2. 期間: 四半期と通期の数字が混在している場合は、必ず「通期（または累計）」の数字を抽出してください。
3. 株式数: sharesOutstanding は、「期末発行済株式数（自己株式を含む）」から「期末自己株式数」を引いた純粋な発行済株式数を計算してください。
4. ★流動負債の抽出（最重要）: 決算短信の1ページ目（サマリー）には「流動負債」が直接書かれていないことがほとんどです。必ず後続ページにある「貸借対照表（バランスシート）」の「負債の部」の中にある「流動負債合計」の数値を探し出してください。どうしても見つからなければ「負債合計 - 固定負債」で計算してください。

出力JSONフォーマット:
{
  "_thought_process": "まず貸借対照表のセクションを探し、流動負債合計の記載を確認しました。次に...", // ここにあなたの思考プロセスや計算式（流動負債をどこから見つけたか等）を短く書いてください
  "sales": 10000, 
  "operatingIncome": 1000,
  "netIncome": 800,
  "totalAssets": 20000,
  "equity": 10000,
  "currentAssets": 8000,
  "currentLiabilities": 4000,
  "totalLiabilities": 10000,
  "investmentSecurities": 0,
  "sharesOutstanding": 2000
}

対象テキスト:
${text.substring(0, 50000)} // 貸借対照表が後ろのページにあることを想定し50,000文字まで拡大
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error details:", errorData);
      throw new Error("API通信中にエラーが発生しました。キーが間違っている可能性があります。");
    }

    const data = await response.json();
    try {
      const resultText = data.candidates[0].content.parts[0].text;
      return JSON.parse(resultText);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("AIからの応答をデータに変換できませんでした。");
    }
  };

  // 6. Handle File Upload
  pdfUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = file.name;
    const apiKey = localStorage.getItem(STORAGE_KEY);

    if (!apiKey) {
      showApiStatus(false, "APIキーを設定してください");
      alert("AI分析を実行するには、Gemini API Keyの保存が必要です。");
      pdfUpload.value = "";
      fileNameDisplay.textContent = "選択されていません";
      return;
    }

    try {
      loadingArea.classList.remove('hidden');

      loadingText.textContent = "PDFからテキストを抽出中...";
      const arrayBuffer = await file.arrayBuffer();
      const pdfText = await extractTextFromPdfBuffer(arrayBuffer);

      loadingText.textContent = "AIで数値を解析中 (約5〜10秒)...";
      const aiResult = await analyzeWithGemini(pdfText, apiKey);

      // Populate fields safely
      const fillField = (id, value) => {
        if (value !== null && value !== undefined && !isNaN(value)) {
          const el = document.getElementById(id);
          if (el) el.value = value;
        }
      };

      fillField('sales', aiResult.sales);
      fillField('operatingIncome', aiResult.operatingIncome);
      fillField('netIncome', aiResult.netIncome);
      fillField('totalAssets', aiResult.totalAssets);
      fillField('equity', aiResult.equity);
      fillField('currentAssets', aiResult.currentAssets);
      fillField('currentLiabilities', aiResult.currentLiabilities);
      fillField('totalLiabilities', aiResult.totalLiabilities);
      fillField('investmentSecurities', aiResult.investmentSecurities);
      fillField('sharesOutstanding', aiResult.sharesOutstanding);

      // Trigger calculate
      calculate();

      loadingText.textContent = "抽出完了！株価を手入力し、計算結果をご確認ください。";
      setTimeout(() => { loadingArea.classList.add('hidden'); }, 3000);

    } catch (error) {
      console.error(error);
      alert(error.message);
      loadingArea.classList.add('hidden');
    } finally {
      pdfUpload.value = ""; // Reset for next time
    }
  });

  // 7. Handle URL Fetch
  fetchPdfBtn.addEventListener('click', async () => {
    const url = pdfUrlInput.value.trim();
    if (!url) return;

    const apiKey = localStorage.getItem(STORAGE_KEY);
    if (!apiKey) {
      showApiStatus(false, "APIキーを設定してください");
      alert("AI分析を実行するには、Gemini API Keyの保存が必要です。");
      return;
    }

    try {
      fileNameDisplay.textContent = "URLから取得中...";
      loadingArea.classList.remove('hidden');
      loadingText.textContent = "PDFをダウンロード中...";

      // CORS回避のためプロキシを経由する
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error("PDFのダウンロードに失敗しました。URLが正しいか、公開されているか確認してください。");
      }

      const arrayBuffer = await response.arrayBuffer();

      loadingText.textContent = "PDFからテキストを抽出中...";
      const pdfText = await extractTextFromPdfBuffer(arrayBuffer);

      loadingText.textContent = "AIで数値を解析中 (約5〜10秒)...";
      const aiResult = await analyzeWithGemini(pdfText, apiKey);

      const fillField = (id, value) => {
        if (value !== null && value !== undefined && !isNaN(value)) {
          const el = document.getElementById(id);
          if (el) el.value = value;
        }
      };

      fillField('sales', aiResult.sales);
      fillField('operatingIncome', aiResult.operatingIncome);
      fillField('netIncome', aiResult.netIncome);
      fillField('totalAssets', aiResult.totalAssets);
      fillField('equity', aiResult.equity);
      fillField('currentAssets', aiResult.currentAssets);
      fillField('currentLiabilities', aiResult.currentLiabilities);
      fillField('totalLiabilities', aiResult.totalLiabilities);
      fillField('investmentSecurities', aiResult.investmentSecurities);
      fillField('sharesOutstanding', aiResult.sharesOutstanding);

      calculate();

      fileNameDisplay.textContent = "URLから取得完了";
      loadingText.textContent = "抽出完了！株価を手入力し、計算結果をご確認ください。";
      setTimeout(() => { loadingArea.classList.add('hidden'); }, 3000);

    } catch (error) {
      console.error(error);
      fileNameDisplay.textContent = "取得エラー";
      alert(error.message);
      loadingArea.classList.add('hidden');
    }
  });

});
