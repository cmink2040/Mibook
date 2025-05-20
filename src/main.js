// main.js

// — state
const menuItems   = ['Chapter Segmentation', 'AI API Settings', 'Textbook Settings'];
let selectedMenu  = menuItems[0];
let topText       = '';
let bottomText    = '';

// — segmentation logic
function segment(text) {
  return text.split(/\n{2,}/).join('\n---\n');
}

// — stub Tauri picker (hook up invoke() here)
async function openFile() {
  console.log('openFile() not yet implemented');
}

// — render into #app
const rootEl = document.getElementById('app');
if (!rootEl) {
  throw new Error('Mount point "#app" not found');
}

function render() {
  // update derived state
  bottomText = selectedMenu === 'Chapter Segmentation'
    ? segment(topText)
    : '';

  // rebuild DOM
  rootEl.innerHTML = `
    <main class="h-screen flex bg-gray-900 text-gray-900">
      <aside class="w-64 bg-gray-200 flex flex-col">
        <header class="px-4 py-4 border-b bg-gray-300 text-lg font-semibold">
          Mibook Menu
        </header>
        <nav class="flex-1 px-2 py-4 space-y-2">
          ${menuItems.map(item => `
            <button data-item="${item}"
              class="w-full text-left px-3 py-2 rounded hover:bg-gray-300 transition
                     ${selectedMenu===item? 'bg-gray-300 font-bold':''}"
            >${item}</button>
          `).join('')}
        </nav>
      </aside>

      <div class="flex-1 grid grid-rows-2 divide-y divide-gray-400">
        <!-- Top Panel -->
        <section class="bg-gray-100 overflow-auto p-4">
          ${selectedMenu==='Chapter Segmentation' ? `
            <div class="flex flex-col h-full">
              <div class="flex mb-2">
                <button id="importBtn" class="px-4 py-2 w-1/2 bg-gray-200 text-sm hover:bg-gray-400">
                  Import
                </button>
                <button id="downloadBtn" class="px-4 py-2 w-1/2 bg-gray-200 text-sm hover:bg-gray-400">
                  Download
                </button>
              </div>
              <textarea id="topArea"
                class="flex-1 w-full p-2 bg-white rounded shadow resize-none text-sm"
                placeholder="Paste or load textbook content here…"
              >${topText}</textarea>
            </div>
          ` : `
            <div class="flex items-center justify-center h-full text-gray-500">
              ${selectedMenu} panel coming soon.
            </div>
          `}
        </section>

        <!-- Bottom Panel -->
        <section class="p-4 bg-gray-100 overflow-auto">
          ${selectedMenu==='Chapter Segmentation' ? `
            <textarea id="bottomArea" readonly
              class="w-full h-full p-2 bg-white rounded shadow resize-none text-sm"
              placeholder="Segmented chapters will appear here…"
            >${bottomText}</textarea>
          ` : `
            <div class="flex items-center justify-center h-full text-gray-500">
              Settings for ${selectedMenu}.
            </div>
          `}
        </section>
      </div>
    </main>
  `;

  // — wire event listeners
  rootEl.querySelectorAll('button[data-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMenu = btn.dataset.item;
      render();
    });
  });

  if (selectedMenu === 'Chapter Segmentation') {
    rootEl.querySelector('#topArea')
      .addEventListener('input', e => {
        topText = e.currentTarget.value;
        rootEl.querySelector('#bottomArea').value = segment(topText);
      });

    rootEl.querySelector('#importBtn')
      .addEventListener('click', openFile);

    rootEl.querySelector('#downloadBtn')
      .addEventListener('click', () => {
        const blob = new Blob([bottomText], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'segmented.txt';
        a.click();
        URL.revokeObjectURL(url);
      });
  }
}

// initial mount
render();
