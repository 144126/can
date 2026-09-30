// @ts-nocheck
const stage = document.getElementById('stage'),
	world = document.getElementById('world');
const cache = {};
const load_tr = (t) => (cache[t] ??= fetch(`/data/${t}.json`).then((r) => r.json()));
let view = { x: 0, y: 0, s: 1 },
	panes = [],
	top_z = 1;

let file, writing, dirty;

const state = () => ({
	v: view,
	p: panes.map((p) => ({
		k: p.k,
		l: p.l,
		x: p.x,
		y: p.y,
		w: p.el.offsetWidth,
		h: p.el.offsetHeight,
		t: p.t,
		r: p.r,
		m: p.m,
		o: p.o
	}))
});

const write_file = async () => {
	if (writing) return (dirty = true);
	writing = true;
	try {
		do {
			dirty = false;
			const w = await file.createWritable();
			await w.write(JSON.stringify(state(), null, 1));
			await w.close();
		} while (dirty);
	} finally {
		writing = false;
	}
};

const save = () => {
	localStorage.setItem('can', JSON.stringify(state()));
	if (file) write_file();
};

const apply_view = () => {
	world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.s})`;
	stage.style.backgroundPosition = `${view.x}px ${view.y}px`;
	stage.style.backgroundSize = `${24 * view.s}px ${24 * view.s}px`;
	save();
};

const render = (b) =>
	b
		.map(([name, chs], bi) =>
			chs
				.map(
					(vs, ci) =>
						`<section class="[content-visibility:auto] [contain-intrinsic-size:auto_1500px] pb-6">
    <h2 data-r="${bi}.${ci + 1}.1" class="mb-2 font-sans text-sm font-semibold lowercase text-neutral-400">${name} ${ci + 1}</h2>
    ${vs.map((v, vi) => v && `<span data-r="${bi}.${ci + 1}.${vi + 1}" class="rounded transition-colors duration-700"><sup class="font-sans text-[0.65em] text-neutral-500">${vi + 1}</sup> ${v} </span>`).join('')}
  </section>`
				)
				.join('')
		)
		.join('');

const jump = (p, r) => {
	const el = p.body.querySelector(`[data-r="${r}"]`);
	if (!el) return;
	let n = 0,
		still = 0;
	const go = () => {
		const d = (el.getBoundingClientRect().top - p.body.getBoundingClientRect().top) / view.s - 8;
		p.body.scrollTop += d;
		still = Math.abs(d) > 1 ? 0 : still + 1;
		if (still < 5 && ++n < 60) requestAnimationFrame(go);
	};
	go();
	el.classList.add('bg-amber-500/30');
	setTimeout(() => el.classList.remove('bg-amber-500/30'), 1500);
};

const opts = (sel, labels) =>
	(sel.innerHTML = labels.map((l, i) => `<option value="${i + 1}">${l}</option>`).join(''));

const show_ref = async (p) => {
	const b = await load_tr(p.t),
		[bi, c, v] = p.r.split('.').map(Number);
	if (!p.bk.options.length)
		opts(
			p.bk,
			b.map(([n]) => n.toLowerCase())
		);
	p.bk.value = bi + 1;
	if (p.ch.dataset.k != bi) {
		opts(
			p.ch,
			b[bi][1].map((_, i) => i + 1)
		);
		p.ch.dataset.k = bi;
	}
	p.ch.value = c;
	if (p.vs.dataset.k != `${bi}.${c}`) {
		opts(
			p.vs,
			b[bi][1][c - 1].map((_, i) => i + 1)
		);
		p.vs.dataset.k = `${bi}.${c}`;
	}
	p.vs.value = v;
};

const fill = async (p) => {
	p.body.innerHTML = '<p class="font-sans text-sm text-neutral-500">loading…</p>';
	p.body.innerHTML = render(await load_tr(p.t));
	jump(p, p.r);
	show_ref(p);
};

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const draw = (p) => {
	p.log.innerHTML = p.m
		.map(
			(x) =>
				`<p class="whitespace-pre-wrap ${x.role === 'user' ? 'text-amber-200' : ''}">${esc(x.s ?? x.content) || '…'}</p>`
		)
		.join('');
	p.log.scrollTop = p.log.scrollHeight;
};

const sys =
	'You are a Bible study helper inside a reading pane. Each user message starts with the verse the reader has focused. Answer in plain, simple words and keep it short. Quote scripture exactly and say when you are unsure.';

const ask = async (p) => {
	const s = p.q.value.trim();
	if (!s) return;
	p.q.value = '';
	const [bi, c, v] = p.r.split('.').map(Number),
		b = await load_tr(p.t);
	const ref = `${b[bi][0]} ${c}:${v}`;
	p.m.push({
		role: 'user',
		content: `[focused verse: ${ref} (${p.t}) "${b[bi][1][c - 1][v - 1]}"]\n${s}`,
		s: `${ref.toLowerCase()} · ${s}`
	});
	const a = { role: 'assistant', content: '' };
	const msgs = [
		{ role: 'system', content: sys },
		...p.m.map(({ role, content }) => ({ role, content }))
	];
	p.m.push(a);
	draw(p);
	save();
	const r = await fetch('/chat', { method: 'POST', body: JSON.stringify({ m: msgs }) });
	if (!r.ok) {
		a.content = `error ${r.status}: ${await r.text()}`;
		draw(p);
		save();
		return;
	}
	const rd = r.body.pipeThrough(new TextDecoderStream()).getReader();
	let buf = '';
	for (;;) {
		const { value, done } = await rd.read();
		if (done) break;
		const lines = (buf + value).split('\n');
		buf = lines.pop();
		for (const l of lines)
			if (l.startsWith('data: {'))
				a.content += JSON.parse(l.slice(6)).choices?.[0]?.delta?.content ?? '';
		draw(p);
		save();
	}
};

const sel_cls = 'rounded bg-neutral-900 px-1 py-0.5 text-sm';

const open_near = (p, r) => {
	let x = p.x + p.el.offsetWidth + 24,
		y = p.y;
	while (panes.some((q) => q.x === x && q.y === y)) y += 32;
	add_pane({ x, y, t: p.t, r });
};

const draw_list = async (p) => {
	const b = await load_tr(p.t);
	p.body.innerHTML =
		p.l
			.map((r, i) => {
				const [bi, c, v] = r.split('.').map(Number);
				return `<div data-r="${r}" class="group flex cursor-pointer items-baseline gap-2 rounded px-2 py-1 hover:bg-neutral-800">
      <span class="shrink-0 font-sans text-sm text-amber-200">${b[bi][0].toLowerCase()} ${c}:${v}</span>
      <span class="truncate text-neutral-400">${b[bi][1][c - 1][v - 1]}</span>
      <button data-i="${i}" class="rm ml-auto font-sans text-neutral-500 opacity-0 group-hover:opacity-100 hover:text-white">×</button>
    </div>`;
			})
			.join('') ||
		'<p class="font-sans text-sm text-neutral-500">pick a verse above and press + to add it.</p>';
};

const add_pane = ({
	k = 'r',
	x,
	y,
	w = 420,
	h = 520,
	t = 'bsb',
	r = '0.1.1',
	m = [],
	o = false,
	l = []
}) => {
	const el = document.createElement('div');
	el.className =
		'absolute flex flex-col resize overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl min-w-60 min-h-32';
	el.innerHTML = `
    <div class="head flex cursor-move select-none items-center gap-2 bg-neutral-800 px-2 py-1 font-sans">
      <select class="tr rounded bg-neutral-900 px-1 text-xs"><option value="bsb">bsb</option><option value="ylt">ylt</option></select>
      <select class="bk min-w-0 flex-1 ${sel_cls}"></select>
      <select class="ch ${sel_cls}"></select>
      <select class="vs ${sel_cls}"></select>
      ${
				k === 'l'
					? '<button class="add ml-auto px-1 text-neutral-400 hover:text-white">+</button>'
					: '<button class="ai ml-auto px-1 text-xs text-neutral-400 hover:text-white">ai</button>'
			}
      <button class="x px-1 text-neutral-400 hover:text-white">×</button>
    </div>
    <div class="body flex-1 cursor-auto overflow-auto ${k === 'l' ? 'p-2' : 'px-5 py-3 text-[17px] leading-relaxed'}"></div>
    ${
			k === 'l'
				? ''
				: `<div class="chat hidden max-h-[45%] flex-col border-t border-neutral-700 font-sans text-sm">
      <div class="log min-h-0 flex-1 space-y-2 overflow-auto px-3 py-2"></div>
      <form class="flex gap-2 p-2"><input class="q min-w-0 flex-1 rounded bg-neutral-800 px-2 py-1 outline-none focus:ring-1 focus:ring-amber-500" placeholder="ask about the focused verse…"><button class="rounded bg-neutral-800 px-2 hover:bg-neutral-700">send</button></form>
    </div>`
		}`;
	world.append(el);
	const p = {
		k,
		el,
		x,
		y,
		t,
		r,
		m,
		o,
		l,
		body: el.querySelector('.body'),
		bk: el.querySelector('.bk'),
		ch: el.querySelector('.ch'),
		vs: el.querySelector('.vs'),
		chat: el.querySelector('.chat'),
		log: el.querySelector('.log'),
		q: el.querySelector('.q')
	};
	panes.push(p);
	Object.assign(el.style, {
		left: x + 'px',
		top: y + 'px',
		width: w + 'px',
		height: h + 'px',
		zIndex: ++top_z
	});
	const tr = el.querySelector('.tr');
	tr.value = t;

	el.addEventListener('pointerdown', () => (el.style.zIndex = ++top_z));
	el.querySelector('.head').addEventListener('pointerdown', (e) => {
		if (e.target.closest('select,button')) return;
		const sx = e.clientX,
			sy = e.clientY,
			ox = p.x,
			oy = p.y;
		const move = (e) => {
			p.x = ox + (e.clientX - sx) / view.s;
			p.y = oy + (e.clientY - sy) / view.s;
			Object.assign(el.style, { left: p.x + 'px', top: p.y + 'px' });
			save();
		};
		addEventListener('pointermove', move);
		addEventListener('pointerup', () => removeEventListener('pointermove', move), { once: true });
	});
	el.querySelector('.x').onclick = () => {
		el.remove();
		panes = panes.filter((q) => q !== p);
		save();
	};
	new ResizeObserver(save).observe(el);

	if (k === 'l') {
		const pick = (r) => {
			p.r = r;
			show_ref(p);
			save();
		};
		p.bk.onchange = () => pick(`${p.bk.value - 1}.1.1`);
		p.ch.onchange = () => pick(`${p.bk.value - 1}.${p.ch.value}.1`);
		p.vs.onchange = () => pick(`${p.bk.value - 1}.${p.ch.value}.${p.vs.value}`);
		tr.onchange = () => {
			p.t = tr.value;
			save();
			draw_list(p);
		};
		el.querySelector('.add').onclick = () => {
			if (!p.l.includes(p.r)) p.l.push(p.r);
			save();
			draw_list(p);
		};
		p.body.addEventListener('click', (e) => {
			if (e.target.closest('.rm')) {
				p.l.splice(e.target.dataset.i, 1);
				save();
				return draw_list(p);
			}
			const hit = e.target.closest('[data-r]');
			if (hit) open_near(p, hit.dataset.r);
		});
		show_ref(p);
		return draw_list(p);
	}

	tr.onchange = () => {
		p.t = tr.value;
		save();
		fill(p);
	};
	const go = (r) => {
		p.r = r;
		jump(p, r);
		show_ref(p);
		save();
	};
	p.bk.onchange = () => go(`${p.bk.value - 1}.1.1`);
	p.ch.onchange = () => go(`${p.bk.value - 1}.${p.ch.value}.1`);
	p.vs.onchange = () => go(`${p.bk.value - 1}.${p.ch.value}.${p.vs.value}`);

	let pending;
	p.body.addEventListener('scroll', () => {
		if (pending) return;
		pending = requestAnimationFrame(() => {
			pending = null;
			const b = p.body.getBoundingClientRect();
			const hit = document.elementFromPoint(b.left + b.width / 2, b.top + 12)?.closest('[data-r]');
			if (!hit || !p.body.contains(hit)) return;
			p.r = hit.dataset.r;
			show_ref(p);
			save();
		});
	});
	p.body.addEventListener('click', (e) => {
		const hit = e.target.closest('span[data-r]');
		if (hit && !getSelection().toString()) open_near(p, hit.dataset.r);
	});

	const toggle = () => {
		p.chat.classList.toggle('hidden', !p.o);
		p.chat.classList.toggle('flex', p.o);
	};
	el.querySelector('.ai').onclick = () => {
		p.o = !p.o;
		toggle();
		save();
		if (p.o) p.q.focus();
	};
	toggle();
	draw(p);
	el.querySelector('form').onsubmit = (e) => {
		e.preventDefault();
		ask(p);
	};
	fill(p);
};

const to_world = (cx, cy) => ({ x: (cx - view.x) / view.s, y: (cy - view.y) / view.s });

stage.addEventListener(
	'wheel',
	(e) => {
		if (e.ctrlKey) {
			e.preventDefault();
			const s = Math.min(4, Math.max(0.1, view.s * Math.exp(-e.deltaY * 0.01)));
			view.x = e.clientX - ((e.clientX - view.x) * s) / view.s;
			view.y = e.clientY - ((e.clientY - view.y) * s) / view.s;
			view.s = s;
		} else {
			if (e.target.closest('.body')) return;
			view.x -= e.deltaX;
			view.y -= e.deltaY;
		}
		apply_view();
	},
	{ passive: false }
);

stage.addEventListener('pointerdown', (e) => {
	if (e.target !== stage && e.target !== world) return;
	const sx = e.clientX - view.x,
		sy = e.clientY - view.y;
	stage.classList.add('cursor-grabbing');
	const move = (e) => {
		view.x = e.clientX - sx;
		view.y = e.clientY - sy;
		apply_view();
	};
	addEventListener('pointermove', move);
	addEventListener(
		'pointerup',
		() => {
			removeEventListener('pointermove', move);
			stage.classList.remove('cursor-grabbing');
		},
		{ once: true }
	);
});

stage.addEventListener('dblclick', (e) => {
	if (e.target !== stage && e.target !== world) return;
	add_pane(to_world(e.clientX, e.clientY));
});

document.getElementById('add').onclick = () =>
	add_pane(
		to_world(innerWidth / 2 - 210 + panes.length * 24, innerHeight / 2 - 260 + panes.length * 24)
	);
document.getElementById('list').onclick = () =>
	add_pane({
		k: 'l',
		...to_world(innerWidth / 2 - 210 + panes.length * 24, innerHeight / 2 - 260 + panes.length * 24)
	});
document.getElementById('home').onclick = () => {
	view = { x: 0, y: 0, s: 1 };
	apply_view();
};

const idb = (mode, f) =>
	new Promise((ok, no) => {
		const q = indexedDB.open('can', 1);
		q.onupgradeneeded = () => q.result.createObjectStore('h');
		q.onsuccess = () => {
			const t = q.result.transaction('h', mode),
				r = f(t.objectStore('h'));
			t.oncomplete = () => ok(r.result);
			t.onerror = no;
		};
	});

const sess = document.getElementById('sess');
const types = [{ description: 'can session', accept: { 'application/json': ['.json'] } }];

const load_state = (s) => {
	file = null;
	world.innerHTML = '';
	panes = [];
	view = s.v;
	s.p.forEach(add_pane);
	apply_view();
};

const bind = (h) => {
	file = h;
	sess.textContent = h.name;
	sess.onclick = null;
	idb('readwrite', (st) => st.put(h, 'f'));
	save();
};

const open_file = async (h) => {
	if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
	load_state(JSON.parse(await (await h.getFile()).text()));
	bind(h);
};

document.getElementById('open').onclick = async () =>
	open_file((await showOpenFilePicker({ types }))[0]);
document.getElementById('new').onclick = async () =>
	bind(await showSaveFilePicker({ suggestedName: 'session.json', types }));

let saved;
try {
	saved = JSON.parse(localStorage.getItem('can'));
} catch {}
if (saved) load_state(saved);
else {
	add_pane({ x: 80, y: 70 });
	apply_view();
}

const url_load = new URLSearchParams(location.search).get('load');
if (url_load)
	fetch(url_load)
		.then((r) => r.json())
		.then((s) => {
			load_state(s);
			sess.textContent = `${url_load.split('/').pop()}: use open session to keep saving to it`;
			history.replaceState(null, '', location.pathname);
		});
else
	idb('readonly', (st) => st.get('f')).then(async (h) => {
		if (!h) return;
		if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return open_file(h);
		sess.textContent = `resume ${h.name}`;
		sess.onclick = () => open_file(h);
	});
