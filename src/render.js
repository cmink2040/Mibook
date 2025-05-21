// — state
const menuItems   = ['Chapter Segmentation', 'AI API Settings', 'Textbook Settings'];
let selectedMenu  = menuItems[0];
let topText       = '';
let bottomText    = '';

// — segmentation logic
// @ts-ignore
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
  // @ts-ignore
  rootEl.innerHTML = `
    <main class="flex bg-gray-900 text-gray-900 flex-col h-full">
     

          ${selectedMenu==='Chapter Segmentation' ? `
              <div class="w-full flex flex-row">

                  <input accept="application/pdf" id="pdf-upload" type=file class="px-4 py-2 w-1/2 bg-gray-200 text-sm hover:bg-gray-400">
                  </input>
                  <button id="downloadBtn" class="px-4 py-2 w-1/2 bg-gray-200 text-sm hover:bg-gray-400">
                    Download
                  </button>
              </div>

              <div id="pdf-container" class="bg-gray-100 p-4"></div>



              <textarea id="bottomArea" readonly class="w-full p-2 bg-white resize-none text-sm" placeholder="Segmented chapters will appear here…">
                ${bottomText}
              </textarea>
          
          ` : `
            <div class="flex items-center justify-center text-gray-500">
              ${selectedMenu} panel coming soon.
            </div>

            <div class="flex items-center justify-center h-full text-gray-500">
              Settings for ${selectedMenu}.
            </div>
          `}
    

            
            </div>
    </main>
  `
  // @ts-ignore
  const uploadInput = document.getElementById('pdf-upload');

  // @ts-ignore
  rootEl.querySelector('#pdf-upload')
  .addEventListener('change', async (e) => {
    // @ts-ignore
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await renderPDF(buffer);
  });


  // — wire event listeners
  // @ts-ignore
  rootEl.querySelectorAll('button[data-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      // @ts-ignore
      selectedMenu = btn.dataset.item;
      render();
    });
  });

  if (selectedMenu === 'Chapter Segmentation') {
    // @ts-ignore
    rootEl.querySelector('#topArea')
      .addEventListener('input', e => {
        // @ts-ignore
        topText = e.currentTarget.value;
        // @ts-ignore
        rootEl.querySelector('#bottomArea').value = segment(topText);
      });

    // // @ts-ignore
    // rootEl.querySelector('#importBtn')
    //   .addEventListener('click', openFile);

    
  }
}

// initial mount
render();

// @ts-ignore
async function renderPDF(arrayBuffer) {

  // Send the file data to the backend and log the chapter count
  const result = await window.electronAPI.countChapters(arrayBuffer);
  if (result.error) {
    console.error('Error counting chapters:', result.error);
  } else {
    console.log('Chapter count:', result.count);
  }
  // @ts-ignore
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  // @ts-ignore
  const container = rootEl.querySelector('#pdf-container');
  // @ts-ignore
  container.innerHTML = ''; // clear previous runs

  const scale = 1.2; // adjust zoom as you like
  container.style.overflowY = 'auto'; // Enable vertical scrolling
  container.style.maxHeight = '500px'; // Set a max height for the container
  container.style.display = 'flex'; // Use flexbox for centering
  container.style.flexDirection = 'column'; // Stack canvases vertically
  container.style.alignItems = 'center'; // Center canvases horizontally

  // Add page count and controls
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.justifyContent = 'space-between';
  controls.style.width = '100%';
  controls.style.marginBottom = '1rem';

  const pageCount = document.createElement('span');
  pageCount.textContent = `Page 1 of ${pdf.numPages}`;
  controls.appendChild(pageCount);

  const printButton = document.createElement('button');
  printButton.textContent = 'Print';
  printButton.style.marginRight = '1rem';
  printButton.addEventListener('click', async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printDocument = printWindow.document;
    printDocument.body.innerHTML = ''; // Clear any existing content

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: vp,
      }).promise;

      printDocument.body.appendChild(canvas);
    }

    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });
  controls.appendChild(printButton);

  const shareButton = document.createElement('button');
  shareButton.textContent = 'Share';
  shareButton.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: 'PDF Document',
        text: 'Check out this PDF document!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert('Sharing is not supported in this browser.');
    }
  });
  controls.appendChild(shareButton);

  container.appendChild(controls);

  // Render pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.display = 'block';
    canvas.style.marginBottom = '1rem';
    // @ts-ignore
    container.appendChild(canvas);

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport: vp,
    }).promise;

    // Update page count on scroll
    canvas.addEventListener('mouseenter', () => {
      pageCount.textContent = `Page ${i} of ${pdf.numPages}`;
    });
  }
}

{/* <aside class="w-64 bg-gray-200 flex flex-col">
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
</aside> */}