const gallery = document.getElementById('gallery');
    const searchBox = document.getElementById('searchBox');
    const langSelect = document.getElementById('langSelect');
    const editor = document.getElementById('editor');
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('offsetSlider');
    const captionInput = document.getElementById('captionInput');
    const resetBtn = document.getElementById('resetCaption');
    const copyBtn = document.getElementById('copyImage');
    const downloadBtn = document.getElementById('downloadImage');
    const closeBtn = document.getElementById('closeEditor');
    const offsetXSlider = document.getElementById('offsetX');
    const offsetYSlider = document.getElementById('offsetY');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    let currentFontSize = parseInt(fontSizeSlider.value, 10);
    let offsetX = 0;
    let offsetY = 0;

    fontSizeSlider.addEventListener('input', () => {
      currentFontSize = parseInt(fontSizeSlider.value, 10);
      redrawCanvas(captionInput.value);
    });

    offsetXSlider.addEventListener('input', () => {
      offsetX = parseInt(offsetXSlider.value);
      redrawCanvas(captionInput.value);
    });

    offsetYSlider.addEventListener('input', () => {
      offsetY = parseInt(offsetYSlider.value);
      redrawCanvas(captionInput.value);
    });


    let episodeChoices;

    let subtitleData = [];
    let currentImg = null;
    let currentCaption = '';
    let originalCaption = '';
    let currentBasePath = '';
    let currentMaxFrames = 0;
    let currentEpisode = '';

    function populateEpisodes() {
      const episodeSelect = document.getElementById('episodeSelect');
      const allEpisodes = [];

      for (let i = 1; i <= 13; i++) {
        const ep = i.toString().padStart(2, '0');
        allEpisodes.push({ value: ep, label: `第 ${i} 集`, selected: true });
      }

      episodeChoices = new Choices(episodeSelect, {
        removeItemButton: true,
        shouldSort: false,
        placeholderValue: '...',
        maxItemCount: 13,
        choices: allEpisodes,
        closeOnSelect: false
      });

      // 監聽變動後，偵測是否需要顯示 fakeAll
      episodeSelect.addEventListener('change', () => {
        handleEpisodeSelectVisual();
        loadSubs();
      });

      // 初始也判斷一次
      handleEpisodeSelectVisual();
    }

    function handleEpisodeSelectVisual() {
      const selectedValues = episodeChoices.getValue(true);
      const allEpisodes = Array.from({ length: 13 }, (_, i) => (i + 1).toString().padStart(2, '0'));
      const isAllSelected = allEpisodes.every(ep => selectedValues.includes(ep));

      const inner = document.querySelector('.choices__inner');
      if (!inner) return;

      // 只有全選且不是 focus 中才 fake All
      // if (isAllSelected && !episodeChoices.dropdown.isActive) {
      if (false) {
        inner.innerHTML = '';

        const fakeAllItem = document.createElement('div');
        fakeAllItem.className = 'choices__item choices__item--selectable';
        fakeAllItem.setAttribute('data-id', 'all');
        fakeAllItem.setAttribute('data-value', 'all');
        fakeAllItem.innerHTML = 'All <button type="button" class="choices__button" data-button>&times;</button>';
        inner.appendChild(fakeAllItem);
      } else {
        episodeChoices.hideDropdown();
        episodeChoices.showDropdown(); // 重建 UI
      }
    }


    async function loadSubs() {
      const selectedEpisodes = episodeChoices.getValue(true);
      subtitleData = [];
      for (const ep of selectedEpisodes) {
        try {
          const res = await fetch(`./subs/avemujica-s01/subs_ep${ep}.json`);
          const data = await res.json();
          data.forEach(entry => entry._episode = ep);
          subtitleData.push(...data);
        } catch (e) {
          console.warn(`⚠️ Failed to load ep${ep}:`, e);
        }
      }
      renderGallery();
    }

    function renderGallery() {
      gallery.innerHTML = '';
      const lang = langSelect.value;
      const keyword = searchBox.value.trim();
      if (!keyword) return;

      subtitleData.forEach(entry => {
        const caption = entry[lang];
        if (!caption || !caption.includes(keyword)) return;

        const imgName = `frames/ep${entry._episode}/${entry.frame_prefix}000.webp`;
        const card = document.createElement('div');
        card.className = 'img-card';

        const img = document.createElement('img');
        img.src = imgName;

        const captionDiv = document.createElement('div');
        captionDiv.className = 'caption';
        captionDiv.textContent = caption;

        card.appendChild(img);
        card.appendChild(captionDiv);
        card.onclick = () => openEditor(entry);
        gallery.appendChild(card);
      });
    }

    function openEditor(entry) {
      const { frame_prefix, max_frame_index, _episode } = entry;
      const caption = entry[langSelect.value];
      const img = new Image();

      offsetX = 0;
      offsetY = 0;
      offsetXSlider.value = 0;
      offsetYSlider.value = 0;

      img.onload = () => {
        // ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // ctx.fillStyle = 'white';
        // ctx.font = '20px Noto Sans TC';
        // ctx.fillText(caption, 20, 340);
        currentImg = img; // 確保 redrawCanvas 可用
        redrawCanvas(caption);
      };

      img.src = `frames/ep${_episode}/${frame_prefix}000.webp`;
      currentImg = img;
      currentCaption = caption;
      originalCaption = caption;
      captionInput.value = caption;

      currentBasePath = frame_prefix;
      currentMaxFrames = max_frame_index;
      currentEpisode = _episode;

      slider.min = 0;
      slider.max = currentMaxFrames;
      slider.value = 0;
      editor.style.display = 'flex';
    }

    captionInput.addEventListener('input', () => {
      redrawCanvas(captionInput.value);
    });

    slider.addEventListener('input', () => {
      const offset = parseInt(slider.value);
      const nextFrame = offset.toString().padStart(3, '0');
      const nextPath = `frames/ep${currentEpisode}/${currentBasePath}${nextFrame}.webp`;
      const img = new Image();
      img.onload = () => {
        currentImg = img; // 更新圖片來源
        redrawCanvas(captionInput.value);
      };
      img.src = nextPath;
      currentImg = img;
    });

    resetBtn.onclick = () => {
      captionInput.value = originalCaption;
      redrawCanvas(originalCaption);
    };

    copyBtn.onclick = async () => {
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert('圖片已複製到剪貼簿');
      });
    };

    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg');
      a.download = 'caption.jpg';
      a.click();
    };

    closeBtn.onclick = () => {
      editor.style.display = 'none';
    };

    function redrawCanvas(text) {
      ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);
      ctx.font = `${currentFontSize}px Noto Sans TC`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const x = canvas.width / 2 + offsetX;
      const y = canvas.height - 20 + offsetY;

      // 加邊框（描邊）
      ctx.lineWidth = currentFontSize / 5;
      ctx.strokeStyle = 'black';
      ctx.strokeText(text, x, y);

      // 正常白字
      ctx.fillStyle = 'white';
      ctx.fillText(text, x, y);
    }

    searchBox.addEventListener('input', renderGallery);
    langSelect.addEventListener('change', renderGallery);


    populateEpisodes();
    loadSubs();