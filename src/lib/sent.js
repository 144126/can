// @ts-nocheck
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const { a: A, p: P, e: E, v: V, r: ERAS } = await (await fetch('/data/sent.json')).json();
const N = E.length;
const $ = (id) => document.getElementById(id);
const clamp = (lo, x, hi) => Math.max(lo, Math.min(hi, x));
const lg = matchMedia('(min-width: 1024px)');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.toggle(
	'dark',
	(localStorage.t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'd' : 'l')) === 'd'
);
$('theme').onclick = () => {
	localStorage.t = document.documentElement.classList.contains('dark') ? 'l' : 'd';
	location.reload();
};
const C = document.documentElement.classList.contains('dark')
	? {
			bg: '#1a1a19',
			land: '#2b2b29',
			band: '#20201e',
			ink: '#ffffff',
			ink2: '#c3c2b7',
			line: '#7a7973',
			sel: '#3987e5',
			alt: '#d95926'
		}
	: {
			bg: '#fcfcfb',
			land: '#ebeae5',
			band: '#f4f3ef',
			ink: '#0b0b0b',
			ink2: '#52514e',
			line: '#9d9c96',
			sel: '#2a78d6',
			alt: '#eb6834'
		};
const tone = 'text-[#52514e] dark:text-[#c3c2b7]';

const GROUP = {
	s: 'sent',
	c: 'sent',
	h: 'sent',
	m: 'sent',
	d: 'told',
	t: 'went',
	g: 'went',
	l: 'went',
	p: 'plan',
	r: 'plan'
};
const DASH = { sent: null, told: [7, 4], went: [0.5, 4], plan: [3, 6] };
const KIND = {
	s: 'sent',
	c: 'sent for',
	d: 'told or led to go',
	t: 'taken along',
	g: 'went, no sender named',
	l: 'left behind',
	h: 'led as a prisoner',
	m: 'sent a message',
	p: 'planned, not recorded as done',
	r: 'asked for, did not happen'
};
const ROLE = {
	s: ['sent by', 'sent'],
	c: ['sent for by', 'sent for'],
	d: ['by', 'went'],
	t: ['taken by', 'taken'],
	g: ['', 'went'],
	l: ['left by', 'left'],
	h: ['led by', 'led'],
	m: ['sent by', 'sent'],
	p: ['planned by', 'to go'],
	r: ['asked by', 'to go']
};

E.forEach((e, i) => {
	e.i = i;
});
const inv = (e, p) => e.s.includes(p) || e.w.includes(p);
const snt = (e, p) => e.b.includes(p);
const at = (e, id) => e.f === id || e.t === id || e.v.includes(id);
const geo_ok = (id) => !!id && P[id][1] != null;
const place = (id) => (id ? P[id][0] : 'not named');
const year = (y) => (y < 0 ? `c. ${-y} bc` : `c. ad ${y}`);
const route = (e) =>
	!e.f && !e.t
		? 'place not named'
		: e.f === e.t
			? place(e.f)
			: [e.f, ...e.v, e.t].map(place).join(' → ');
const shape = (e) =>
	e.f === 'heaven'
		? 'heaven'
		: e.t === 'world'
			? 'world'
			: geo_ok(e.f) && geo_ok(e.t) && e.f !== e.t
				? 'move'
				: geo_ok(e.f) || geo_ok(e.t)
					? 'ring'
					: 'none';
const end_of = (e) => (shape(e) === 'world' ? e.f : geo_ok(e.t) ? e.t : geo_ok(e.f) ? e.f : null);
const start_of = (e) => (e.f === 'heaven' ? null : geo_ok(e.f) ? e.f : geo_ok(e.t) ? e.t : null);

const n_in = (p) => E.filter((e) => inv(e, p)).length,
	n_by = (p) => E.filter((e) => snt(e, p)).length;
const EVERYONE = Object.keys(A)
	.filter((p) => n_in(p) + n_by(p))
	.sort((a, b) => n_in(b) + n_by(b) - n_in(a) - n_by(a) || A[a].localeCompare(A[b]));
const TRAVELERS = EVERYONE.filter((p) => n_in(p));
const LANES = TRAVELERS.filter(
	(p) => n_in(p) >= 3 && !['runner', 'messengers', 'officers', 'angel'].includes(p)
).sort((a, b) => E.findIndex((e) => inv(e, a)) - E.findIndex((e) => inv(e, b)));
LANES.push('others');
const lanes_of = (e) => {
	const l = LANES.filter((p) => inv(e, p));
	return l.length ? l : ['others'];
};
const USED = Object.keys(P).filter((id) => geo_ok(id) && E.some((e) => at(e, id)));
const WEIGHT = Object.fromEntries(USED.map((id) => [id, E.filter((e) => at(e, id)).length]));

let cur = N - 1,
	sel = null,
	who = null,
	spot = null,
	hov = null,
	tr = 'b',
	timer = null;
let k = 1,
	step = lg.matches ? 14 : 12,
	lh = 14,
	pz = 1,
	area = 'map';

const seq = () =>
	who
		? E.filter((e) => inv(e, who) || snt(e, who)).map((e) => e.i)
		: spot
			? E.filter((e) => at(e, spot)).map((e) => e.i)
			: E.map((e) => e.i);

// tooltip
const tip = $('tip');
const tip_html = (e) =>
	`<p class="font-medium">${e.x}</p><p class="mt-0.5 opacity-70">${year(e.y)} · ${route(e)}</p>`;
function tip_at(ev) {
	const r = tip.getBoundingClientRect();
	tip.style.left = clamp(8, ev.clientX + 14, innerWidth - r.width - 8) + 'px';
	tip.style.top =
		(ev.clientY + 20 + r.height > innerHeight ? ev.clientY - r.height - 12 : ev.clientY + 20) +
		'px';
}
function show_tip(ev, html) {
	if (ev.pointerType === 'touch') return;
	tip.innerHTML = html;
	tip.classList.remove('hidden');
	tip_at(ev);
}
const hide_tip = () => tip.classList.add('hidden');
function hover(ev, i) {
	if (ev.pointerType === 'touch') return;
	hov = i;
	show_tip(ev, tip_html(E[i]));
	paint();
}
function unhover() {
	hov = null;
	hide_tip();
	paint();
}

// map
const box = $('map');
const svg = d3
	.select(box)
	.insert('svg', ':first-child')
	.attr('class', 'absolute inset-0 block select-none')
	.attr('role', 'img')
	.attr('aria-label', 'map of every sending');
const g = svg.append('g');
const land_el = g.append('path').attr('fill', C.land);
const layer = () => g.append('g');
const arcs_l = layer(),
	own_l = layer(),
	ends_l = layer().attr('pointer-events', 'none'),
	arrows_l = layer().attr('pointer-events', 'none');
const heaven_l = layer().attr('pointer-events', 'none'),
	places_l = layer(),
	pills_l = layer().attr('pointer-events', 'none'),
	fx_l = layer().attr('pointer-events', 'none');
const proj = d3.geoMercator();
let W = 0,
	H = 0,
	PT = {},
	NEED = {},
	land = null,
	fitting = false;
const pt = (id) => PT[id];

const MAPPED = E.filter((e) => shape(e) !== 'none');
const arc = arcs_l.selectAll('g').data(MAPPED).join('g');
const vis = arc.append('path').attr('fill', 'none').attr('stroke-linecap', 'round');
const hit = arc
	.append('path')
	.attr('fill', 'none')
	.attr('stroke', 'transparent')
	.attr('pointer-events', 'stroke')
	.style('cursor', 'pointer')
	.on('pointerenter', (ev, e) => hover(ev, e.i))
	.on('pointermove', tip_at)
	.on('pointerleave', unhover)
	.on('click', (ev, e) => pick(e.i));
const NODE = {};
vis.each(function (e) {
	NODE[e.i] = this;
});
const end = ends_l
	.selectAll('circle')
	.data(MAPPED.filter((e) => shape(e) === 'move'))
	.join('circle');

const pl = places_l
	.selectAll('g')
	.data(USED)
	.join('g')
	.style('cursor', 'pointer')
	.on('pointerenter', (ev, id) =>
		show_tip(
			ev,
			`<p class="font-medium">${place(id)}</p><p class="mt-0.5 opacity-70">${WEIGHT[id]} ${WEIGHT[id] === 1 ? 'event' : 'events'} · click to list them</p>`
		)
	)
	.on('pointermove', tip_at)
	.on('pointerleave', hide_tip)
	.on('click', (ev, id) => pick_place(id));
const pl_ring = pl.append('circle').attr('fill', 'none').attr('stroke', C.sel);
const pl_dot = pl.append('circle').attr('fill', C.ink2);
const pl_hit = pl.append('circle').attr('fill', 'transparent');
const pl_txt = pl
	.append('text')
	.text(place)
	.attr('paint-order', 'stroke')
	.attr('stroke', C.bg)
	.attr('stroke-linejoin', 'round');
const dot_r = (id) => 1.3 + Math.sqrt(WEIGHT[id]) * 0.55;

const wheel_f = (ev) => Math.exp(-clamp(-30, ev.deltaY * (ev.deltaMode === 1 ? 20 : 1), 30) * 0.01);
const zoom = d3
	.zoom()
	.scaleExtent([1, 60])
	.wheelDelta((ev) => Math.log2(wheel_f(ev)))
	.filter((ev) =>
		ev.type === 'wheel'
			? lg.matches || ev.ctrlKey || ev.metaKey
			: ev.type.startsWith('touch')
				? lg.matches
				: !ev.button
	)
	.on('zoom', (ev) => {
		k = ev.transform.k;
		g.attr('transform', ev.transform);
		geo();
	});
svg.call(zoom);
const touch_mode = () => svg.style('touch-action', lg.matches ? 'none' : 'pan-y');
touch_mode();

const ring = ([x, y], r) => `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
function path_d(e) {
	const f = pt(e.f),
		t = pt(e.t),
		sh = shape(e);
	if (sh === 'heaven')
		return `M${t[0] - 34 / k},${t[1] - 110 / k}Q${t[0] - 34 / k},${t[1] - 22 / k} ${t[0]},${t[1]}`;
	if (sh === 'world') return ring(f, 26 / k);
	if (sh === 'ring') return ring(f || t, 7 / k);
	if (e.v.length) return d3.line().curve(d3.curveCatmullRom.alpha(0.5))([f, ...e.v.map(pt), t]);
	const [dx, dy] = [t[0] - f[0], t[1] - f[1]];
	return `M${f}Q${(f[0] + t[0]) / 2 - dy * 0.2},${(f[1] + t[1]) / 2 + dx * 0.2} ${t}`;
}

function layout_map() {
	const w = box.clientWidth,
		h = box.clientHeight;
	if (!land || !w || !h || (w === W && h === H)) return;
	const refit = fitting || !W;
	svg.interrupt();
	const t0 = d3.zoomTransform(svg.node());
	const prev = !refit
		? { c: proj.invert(t0.invert([W / 2, H / 2])), s: proj.scale() * t0.k }
		: null;
	W = w;
	H = h;
	svg.attr('width', W).attr('height', H);
	const pad = clamp(16, Math.min(W, H) * 0.06, 48);
	proj
		.clipExtent(null)
		.fitExtent(
			[
				[pad, pad],
				[W - pad - clamp(0, W * 0.08, 64), H - pad]
			],
			{ type: 'MultiPoint', coordinates: USED.map((id) => [P[id][1], P[id][2]]) }
		)
		.clipExtent([
			[-W, -H],
			[2 * W, 2 * H]
		]);
	land_el.attr('d', d3.geoPath(proj)(land));
	PT = Object.fromEntries(USED.map((id) => [id, proj([P[id][1], P[id][2]])]));
	NEED = Object.fromEntries(
		USED.map((id) => {
			const [x, y] = PT[id];
			let need = 1;
			for (const q of USED)
				if (q !== id && (WEIGHT[q] > WEIGHT[id] || (WEIGHT[q] === WEIGHT[id] && q < id)))
					need = Math.max(need, 46 / Math.max(Math.hypot(PT[q][0] - x, PT[q][1] - y), 0.01));
			return [id, need];
		})
	);
	zoom
		.extent([
			[0, 0],
			[W, H]
		])
		.translateExtent([
			[-W, -H],
			[2 * W, 2 * H]
		]);
	if (prev) {
		const kk = clamp(1, prev.s / proj.scale(), 60),
			p = proj(prev.c);
		svg.call(
			zoom.transform,
			d3.zoomIdentity.translate(W / 2 - kk * p[0], H / 2 - kk * p[1]).scale(kk)
		);
	} else {
		svg.call(zoom.transform, d3.zoomIdentity);
		fit_view(false);
	}
}

function geo() {
	if (!W) return;
	vis.attr('d', path_d);
	hit.attr('d', path_d).attr('stroke-width', (lg.matches ? 12 : 22) / k);
	end.attr('cx', (e) => pt(e.t)[0]).attr('cy', (e) => pt(e.t)[1]);
	pl.attr('transform', (id) => `translate(${pt(id)})`);
	pl_dot.attr('r', (id) => dot_r(id) / k);
	pl_ring.attr('r', (id) => (dot_r(id) + 3.5) / k).attr('stroke-width', 1.8 / k);
	pl_hit.attr('r', (lg.matches ? 9 : 14) / k);
	pl_txt
		.attr('x', (id) => (dot_r(id) + 3) / k)
		.attr('y', 3.8 / k)
		.attr('font-size', 11.5 / k)
		.attr('stroke-width', 3.2 / k);
	paint();
}

const places_of = (es) => es.flatMap((e) => [e.f, e.t, ...e.v]).filter(geo_ok);
const ids_now = () =>
	sel != null
		? places_of([E[sel]])
		: who
			? places_of(E.filter((e) => inv(e, who) || snt(e, who)))
			: spot
				? places_of(E.filter((e) => at(e, spot)))
				: USED;
function fit(ids, anim = true, max = 12) {
	const ps = [...new Set(ids)].map(pt).filter(Boolean);
	if (!ps.length || !W) return;
	const [x0, x1] = d3.extent(ps, (p) => p[0]),
		[y0, y1] = d3.extent(ps, (p) => p[1]);
	const pad = Math.min(64, W * 0.12),
		low = lg.matches || !$('card').textContent ? 0 : $('card').offsetHeight + 12;
	const s = clamp(
		1,
		Math.min((W - pad * 2) / Math.max(x1 - x0, 1), (H - pad * 2 - low) / Math.max(y1 - y0, 1)),
		max
	);
	const t = d3.zoomIdentity
		.translate(W / 2 - (s * (x0 + x1)) / 2, (H - low) / 2 - (s * (y0 + y1)) / 2)
		.scale(s);
	if (!anim || calm) return svg.call(zoom.transform, t);
	fitting = true;
	svg
		.transition()
		.duration(850)
		.ease(d3.easeCubicInOut)
		.call(zoom.transform, t)
		.on('end interrupt', () => {
			fitting = false;
		});
}
const fit_view = (anim = true) => fit(ids_now(), anim, sel != null ? 7 : 12);

// roles decide every color on the map and the timeline
const STY = {
	hov: [C.ink, 2.6, 1],
	focus: [C.sel, 3.2, 1],
	sel: [C.sel, 2.2, 0.95],
	alt: [C.alt, 2, 0.95],
	dim: [C.line, 1, 0.2],
	base: [C.line, 1.25, 0.62]
};
const LIT = new Set(['hov', 'focus', 'sel', 'alt']);
function role(e) {
	if (e.i === hov) return 'hov';
	if (e.i === sel) return 'focus';
	if (who) return inv(e, who) ? 'sel' : snt(e, who) ? 'alt' : 'dim';
	if (spot) return at(e, spot) ? 'sel' : 'dim';
	return sel != null ? 'dim' : 'base';
}
const steps_of = (p) => E.filter((e) => inv(e, p) && e.i <= cur);
const compress = (ns) =>
	ns
		.reduce((out, n) => {
			const last = out.at(-1);
			if (typeof n === 'number' && last && last[1] === n - 1) last[1] = n;
			else out.push([n, n]);
			return out;
		}, [])
		.map(([a, b]) => (a === b ? a : `${a}–${b}`))
		.join(', ');

function arrow_d(e) {
	const n = NODE[e.i],
		L = n.getTotalLength();
	if (!L) return null;
	const a = n.getPointAtLength(L * 0.56),
		b = n.getPointAtLength(Math.min(L, L * 0.57 + 0.01)),
		ang = Math.atan2(b.y - a.y, b.x - a.x),
		s = 5.5 / k;
	const p = (d) => `${a.x + s * Math.cos(ang + d)},${a.y + s * Math.sin(ang + d)}`;
	return `M${p(0)}L${p(2.5)}L${p(-2.5)}Z`;
}

function paint() {
	const R = new Map(E.map((e) => [e.i, role(e)]));
	const lit = (e) => LIT.has(R.get(e.i));
	STY.sel[2] = STY.alt[2] = sel != null ? 0.4 : 0.95;
	if (W) {
		arc.style('display', (e) => (e.i <= cur && (shape(e) !== 'ring' || lit(e)) ? null : 'none'));
		vis
			.attr('stroke', (e) => STY[R.get(e.i)][0])
			.attr('stroke-width', (e) => STY[R.get(e.i)][1] / k)
			.attr('opacity', (e) => STY[R.get(e.i)][2])
			.attr(
				'stroke-dasharray',
				(e) => DASH[GROUP[e.k]]?.map((v) => (v * (lit(e) ? 1.4 : 1)) / k).join(' ') ?? null
			);
		arc.filter(lit).raise();
		end
			.style('display', (e) => (e.i <= cur ? null : 'none'))
			.attr('r', (e) => (lit(e) ? 3.2 : 2) / k)
			.attr('fill', (e) => STY[R.get(e.i)][0])
			.attr('opacity', (e) => STY[R.get(e.i)][2]);
		arrows_l
			.selectAll('path')
			.data(
				MAPPED.filter((e) => e.i <= cur && lit(e) && ['move', 'heaven'].includes(shape(e))),
				(e) => e.i
			)
			.join('path')
			.attr('d', arrow_d)
			.attr('fill', (e) => STY[R.get(e.i)][0]);

		const steps = who ? steps_of(who) : [];
		const gaps = steps
			.slice(1)
			.map((e, j) => [end_of(steps[j]), start_of(e)])
			.filter(([a, b]) => a && b && a !== b);
		own_l
			.selectAll('path')
			.data(gaps)
			.join('path')
			.attr('d', ([a, b]) => `M${pt(a)}L${pt(b)}`)
			.attr('fill', 'none')
			.attr('stroke', C.sel)
			.attr('stroke-width', 1.6 / k)
			.attr('stroke-dasharray', `${0.5 / k} ${4.5 / k}`)
			.attr('stroke-linecap', 'round');
		const stops = new Map();
		steps.forEach((e, j) => {
			const p = end_of(e);
			if (p) stops.set(p, [...(stops.get(p) || []), j + 1]);
		});
		const s0 = steps.length && start_of(steps[0]);
		if (s0 && !stops.has(s0)) stops.set(s0, ['start']);
		const pill = pills_l
			.selectAll('g')
			.data(
				[...stops].map(([id, ns]) => ({ id, t: compress(ns) })),
				(d) => d.id
			)
			.join((en) => {
				const q = en.append('g');
				q.append('rect');
				q.append('text');
				return q;
			});
		pill
			.select('text')
			.text((d) => d.t)
			.attr('x', 5 / k)
			.attr('y', 9.2 / k)
			.attr('font-size', 10 / k)
			.attr('font-weight', 600)
			.attr('fill', '#fff');
		pill.each(function (d) {
			const w = this.querySelector('text').getComputedTextLength() + 10 / k;
			d3.select(this)
				.attr('transform', `translate(${pt(d.id)[0] - w - 2 / k},${pt(d.id)[1] - 16 / k})`)
				.select('rect')
				.attr('width', w)
				.attr('height', 13 / k)
				.attr('rx', 6.5 / k)
				.attr('fill', C.sel);
		});

		heaven_l
			.selectAll('text')
			.data(
				MAPPED.filter((e) => e.i <= cur && lit(e) && shape(e) === 'heaven'),
				(e) => e.i
			)
			.join('text')
			.text('heaven')
			.attr('x', (e) => pt(e.t)[0] - 34 / k)
			.attr('y', (e) => pt(e.t)[1] - 116 / k)
			.attr('text-anchor', 'middle')
			.attr('font-size', 11 / k)
			.attr('font-weight', 600)
			.attr('fill', (e) => STY[R.get(e.i)][0])
			.attr('paint-order', 'stroke')
			.attr('stroke', C.bg)
			.attr('stroke-width', 3 / k);
		const hot = new Set(places_of(E.filter((e) => e.i <= cur && lit(e))));
		if (spot) hot.add(spot);
		pl_txt
			.style('display', (id) => (hot.has(id) || k >= NEED[id] ? null : 'none'))
			.attr('fill', (id) => (hot.has(id) ? C.ink : C.ink2))
			.attr('font-weight', (id) => (hot.has(id) ? 600 : 400));
		pl_dot.attr('opacity', (id) => (hot.size && !hot.has(id) ? 0.35 : 0.8));
		pl_ring.attr('opacity', (id) => (id === spot ? 1 : 0));
	}

	marks
		.attr('fill', (d) =>
			d.e.i > cur
				? 'none'
				: lit(d.e)
					? STY[R.get(d.e.i)][0]
					: ['p', 'r'].includes(d.e.k)
						? C.bg
						: C.line
		)
		.attr('stroke', (d) => (lit(d.e) ? STY[R.get(d.e.i)][0] : C.line))
		.attr('opacity', (d) => (d.e.i > cur ? 0.4 : lit(d.e) || R.get(d.e.i) === 'base' ? 1 : 0.3));
	lines
		.attr('stroke', (p) => (p === who ? C.sel : C.line))
		.attr('stroke-width', (p) => (p === who ? 2 : 1))
		.attr('opacity', (p) => (p === who ? 0.9 : who || spot || sel != null ? 0.22 : 0.5));
	links
		.attr('stroke', (e) => (lit(e) ? STY[R.get(e.i)][0] : C.line))
		.attr('stroke-width', (e) => (lit(e) ? 1.8 : 1))
		.attr('opacity', (e) => (e.i > cur ? 0.12 : lit(e) ? 0.9 : 0.3));
	col_sel.attr('x', sel != null ? X(sel) - step / 2 : -99).attr('width', step);
	col_hov.attr('x', hov != null ? X(hov) - step / 2 : -99).attr('width', step);
	head
		.style('display', cur < N - 1 || timer ? null : 'none')
		.attr('transform', `translate(${X(Math.max(cur, 0))},0)`);
	lanes_el
		.querySelectorAll('[data-lane]')
		.forEach((b) => b.classList.toggle('!text-[#2a78d6]', b.dataset.lane === who));

	const s = seq(),
		pos = s.indexOf(cur);
	$('now').textContent =
		(timer || cur < N - 1) && cur >= 0
			? `${pos >= 0 ? pos + 1 : cur + 1} of ${pos >= 0 ? s.length : N} · ${year(E[cur].y)} · ${E[cur].x}`
			: `${N} events · press play, or drag along the dates`;
	$('play').textContent = timer ? 'pause' : who ? 'play journey' : spot ? 'play place' : 'play';
	document
		.querySelectorAll('[data-tr]')
		.forEach(
			(b) =>
				(b.className = `rounded-md px-2.5 ${b.dataset.tr === tr ? 'bg-[#0b0b0b] text-white dark:bg-white dark:text-[#0b0b0b]' : ''}`)
		);
}

function animate(e, color) {
	if (calm || !W || e.i > cur) return;
	const sh = shape(e);
	if (sh === 'move' || sh === 'heaven') {
		const n = NODE[e.i],
			L = n.getTotalLength();
		fx_l
			.append('circle')
			.attr('r', 5 / k)
			.attr('fill', color)
			.attr('stroke', C.bg)
			.attr('stroke-width', 1.5 / k)
			.transition()
			.duration(1000)
			.ease(d3.easeCubicInOut)
			.attrTween('cx', () => (t) => n.getPointAtLength(L * t).x)
			.attrTween('cy', () => (t) => n.getPointAtLength(L * t).y)
			.transition()
			.duration(300)
			.attr('opacity', 0)
			.remove();
	} else if (sh !== 'none') {
		const c = pt(sh === 'world' ? e.f : start_of(e));
		for (const delay of [0, 280])
			fx_l
				.append('circle')
				.attr('cx', c[0])
				.attr('cy', c[1])
				.attr('r', 3 / k)
				.attr('fill', 'none')
				.attr('stroke', color)
				.attr('stroke-width', 2 / k)
				.transition()
				.delay(delay)
				.duration(1100)
				.ease(d3.easeCubicOut)
				.attr('r', (sh === 'world' ? 64 : 22) / k)
				.attr('opacity', 0)
				.remove();
	}
}
const color_for = (e) => (who && snt(e, who) && !inv(e, who) ? C.alt : C.sel);

// timeline
const tl = $('tl'),
	lanes_el = $('lanes'),
	PAD = 14,
	TOP = 38;
const X = (i) => PAD + i * step,
	Y = (p) => TOP + LANES.indexOf(p) * lh + lh / 2;
const tsvg = d3.select(tl).append('svg').attr('class', 'block select-none');
const ERA_GROUPS = d3.groups(E, (e) => e.era);
const band = tsvg
	.append('g')
	.selectAll('rect')
	.data(ERA_GROUPS)
	.join('rect')
	.attr('fill', (d, j) => (j % 2 ? C.band : 'transparent'));
const col_sel = tsvg.append('rect').attr('fill', C.sel).attr('opacity', 0.12);
const col_hov = tsvg.append('rect').attr('fill', C.ink).attr('opacity', 0.06);
const era_txt = tsvg
	.append('g')
	.selectAll('text')
	.data(ERA_GROUPS)
	.join('text')
	.attr('y', 15)
	.attr('font-size', 11)
	.attr('font-weight', 600)
	.attr('fill', C.ink);
const ticks_l = tsvg.append('g');
const lines = tsvg
	.append('g')
	.attr('fill', 'none')
	.selectAll('path')
	.data(LANES.slice(0, -1))
	.join('path');
const links = tsvg
	.append('g')
	.selectAll('line')
	.data(E.filter((e) => lanes_of(e).length > 1))
	.join('line');
const marks = tsvg
	.append('g')
	.selectAll('circle')
	.data(E.flatMap((e) => lanes_of(e).map((p) => ({ e, p }))))
	.join('circle')
	.attr('stroke-width', 1.3);
const head = tsvg.append('g').attr('pointer-events', 'none');
const head_line = head
	.append('line')
	.attr('y1', TOP - 8)
	.attr('stroke', C.ink)
	.attr('stroke-width', 1.5);
head
	.append('circle')
	.attr('cy', TOP - 8)
	.attr('r', 4)
	.attr('fill', C.ink);
const hits = tsvg
	.append('g')
	.selectAll('rect')
	.data(E)
	.join('rect')
	.attr('fill', 'transparent')
	.style('cursor', 'pointer')
	.on('pointerenter', (ev, e) => hover(ev, e.i))
	.on('pointermove', tip_at)
	.on('pointerleave', unhover)
	.on('click', (ev, e) => pick(e.i));
const scrub = tsvg
	.append('rect')
	.attr('fill', 'transparent')
	.style('cursor', 'ew-resize')
	.call(
		d3.drag().on('start drag', (ev) => {
			stop();
			cur = clamp(0, Math.round((ev.x - PAD) / step), N - 1);
			sel = null;
			render();
		})
	);
lanes_el.innerHTML = LANES.map((p) =>
	p === 'others'
		? `<span data-lane="others" class="absolute right-2 -translate-y-1/2 truncate leading-none ${tone}">everyone else</span>`
		: `<button data-p="${p}" data-lane="${p}" class="absolute right-2 max-w-[calc(100%-0.75rem)] -translate-y-1/2 truncate text-right leading-none transition-colors hover:text-[#0b0b0b] dark:hover:text-white ${tone}">${A[p]}</button>`
).join('');

function tl_layout() {
	lh = lg.matches ? clamp(11, Math.floor((innerHeight * 0.3 - 44) / LANES.length), 16) : 14;
	const w = X(N - 1) + PAD,
		h = TOP + LANES.length * lh + 6;
	tsvg.attr('width', w).attr('height', h);
	lanes_el.style.height = h + 'px';
	band
		.attr('x', ([, es]) => X(es[0].i) - step / 2)
		.attr('width', ([, es]) => es.length * step)
		.attr('height', h);
	era_txt.each(function ([era, es], j) {
		const next = ERA_GROUPS[j + 1],
			room = (next ? X(next[1][0].i) : w) - X(es[0].i) - 8,
			full = ERAS[era],
			n = Math.floor(room / 6.7);
		d3.select(this)
			.attr('x', X(es[0].i) - step / 2 + 6)
			.text(n >= full.length ? full : n >= 5 ? full.slice(0, n - 1) + '…' : '');
	});
	let last = -1e9;
	const ticks = E.filter(
		(e) => (e.i === 0 || e.y !== E[e.i - 1].y) && X(e.i) - last >= 54 && (last = X(e.i))
	);
	ticks_l
		.selectAll('text')
		.data(ticks, (e) => e.i)
		.join('text')
		.attr('x', (e) => X(e.i) - step / 2 + 6)
		.attr('y', 30)
		.attr('font-size', 10.5)
		.attr('fill', C.ink2)
		.text((e) => year(e.y));
	lines.attr('d', (p) => d3.line()(E.filter((e) => inv(e, p)).map((e) => [X(e.i), Y(p)])));
	links
		.attr('x1', (e) => X(e.i))
		.attr('x2', (e) => X(e.i))
		.attr('y1', (e) => d3.min(lanes_of(e), Y))
		.attr('y2', (e) => d3.max(lanes_of(e), Y));
	marks
		.attr('cx', (d) => X(d.e.i))
		.attr('cy', (d) => Y(d.p))
		.attr('r', (d) => clamp(1.8, step * 0.26, 4) * (GROUP[d.e.k] === 'went' ? 0.75 : 1));
	hits
		.attr('x', (e) => X(e.i) - step / 2)
		.attr('width', step)
		.attr('y', TOP - 4)
		.attr('height', h - TOP + 4);
	col_sel.attr('y', TOP - 4).attr('height', h - TOP + 4);
	col_hov.attr('y', TOP - 4).attr('height', h - TOP + 4);
	scrub.attr('width', w).attr('height', TOP - 4);
	head_line.attr('y2', h);
	lanes_el.querySelectorAll('[data-lane]').forEach((b) => (b.style.top = Y(b.dataset.lane) + 'px'));
	paint();
}
function zoom_tl(f, cx = tl.getBoundingClientRect().left + tl.clientWidth / 2) {
	const x = cx - tl.getBoundingClientRect().left,
		u = (tl.scrollLeft + x - PAD) / step;
	step = f ? clamp(3, step * f, 56) : clamp(3, (tl.clientWidth - PAD * 2) / (N - 1), 56);
	tl_layout();
	tl.scrollLeft = f ? PAD + u * step - x : 0;
}
const reveal = (i) => {
	const x = X(i);
	if (x < tl.scrollLeft + 40 || x > tl.scrollLeft + tl.clientWidth - 40)
		tl.scrollTo({ left: x - tl.clientWidth / 3, behavior: calm ? 'auto' : 'smooth' });
};

// side panel
const h2 = (t) => `<h2 class="mb-1.5 mt-8 text-[13px] font-semibold ${tone}">${t}</h2>`;
const btn =
	'rounded-full border border-black/10 px-3 py-1 text-[13px] leading-5 transition-colors hover:border-black/30 hover:bg-black/[0.03] dark:border-white/15 dark:hover:border-white/40 dark:hover:bg-white/5';
const chip = (p, n) =>
	`<button data-p="${p}" class="${btn}">${A[p]}${n ? `<span class="ml-1.5 tabular-nums opacity-50">${n}</span>` : ''}</button>`;
const chips = (list) =>
	`<div class="flex flex-wrap gap-1.5">${list.map(([p, n]) => chip(p, n)).join('')}</div>`;
const place_btn = (id) =>
	geo_ok(id)
		? `<button data-l="${id}" class="underline decoration-current/25 underline-offset-[3px] transition-colors hover:decoration-current">${place(id)}</button>`
		: `<span>${place(id)}</span>`;
const route_html = (e) =>
	e.f === e.t
		? place_btn(e.f)
		: [e.f, ...e.v, e.t].map(place_btn).join(' <span class="opacity-40">→</span> ');
const line_icon = (grp, color = C.ink2) =>
	`<svg width="26" height="8" class="shrink-0"><line x1="3" y1="4" x2="23" y2="4" stroke="${color}" stroke-width="2" stroke-linecap="round" ${DASH[grp] ? `stroke-dasharray="${DASH[grp].join(' ')}"` : ''}/></svg>`;
const row = (
	e,
	lead,
	alt
) => `<button data-e="${e.i}" class="flex w-full gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${e.i === sel ? 'bg-[#2a78d6]/10' : ''}">
  <span class="w-12 shrink-0 pt-px text-xs tabular-nums ${alt ? 'text-[#eb6834] dark:text-[#d95926]' : tone}">${lead ?? year(e.y)}</span>
  <span class="min-w-0 flex-1"><span class="block leading-snug">${e.x}</span><span class="mt-0.5 block truncate text-xs ${tone}">${lead != null ? year(e.y) + ' · ' : ''}${route(e)}</span></span></button>`;
const back_btn = (label) =>
	`<button data-back class="-ml-1 flex items-center gap-1 rounded-full px-1 py-0.5 text-sm ${tone} transition-colors hover:text-[#0b0b0b] dark:hover:text-white">← ${label}</button>`;
const rollup = (list) =>
	d3
		.rollups(
			list,
			(v) => v.length,
			(d) => d
		)
		.sort((a, b) => b[1] - a[1] || A[a[0]].localeCompare(A[b[0]]));
const panel_el = $('panel'),
	scroll_mem = {};
let view_key = '';

function view_event() {
	const e = E[sel],
		c = seq(),
		j = c.indexOf(sel),
		[by_l, s_l] = ROLE[e.k];
	const ctx = who ? A[who] : spot ? place(spot) : 'all events';
	const roles = [
		[by_l, e.b],
		[s_l, e.s],
		['with', e.w.filter((p) => !e.b.includes(p))]
	].filter(([l, ps]) => l && ps.length);
	const arrow = (d, on, label) =>
		`<button data-nav="${d}" aria-label="${label}" class="grid size-8 place-items-center rounded-full text-lg hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10" ${on ? '' : 'disabled'}>${d < 0 ? '‹' : '›'}</button>`;
	return `<div class="flex items-center justify-between gap-3">${back_btn(ctx)}
    ${j >= 0 ? `<div class="flex items-center gap-0.5 text-sm ${tone}">${arrow(-1, j > 0, 'previous')}<span class="min-w-14 text-center tabular-nums">${j + 1} / ${c.length}</span>${arrow(1, j < c.length - 1, 'next')}</div>` : ''}</div>
    <p class="mt-6 flex items-center gap-2 text-[13px] ${tone}">${line_icon(GROUP[e.k])}${year(e.y)} · ${KIND[e.k]}</p>
    <h1 class="mt-2 text-[22px] font-semibold leading-[1.25] tracking-tight">${e.x}</h1>
    <p class="mt-3 leading-relaxed">${route_html(e)}</p>
    ${e.n ? `<p class="mt-3 leading-relaxed ${tone}">${e.n}</p>` : ''}
    <div class="mt-6 grid gap-3">${roles.map(([l, ps]) => `<div><p class="mb-1.5 text-xs ${tone}">${l}</p>${chips(ps.map((p) => [p]))}</div>`).join('')}</div>
    ${h2(e.r.length > 1 ? 'the verses' : 'the verse')}
    ${e.r.map((r) => `<figure class="mb-6"><figcaption class="mb-1 text-[13px] font-medium">${r.toLowerCase()} <span class="font-normal ${tone}">· ${tr === 'b' ? 'bsb' : 'ylt'}</span></figcaption><blockquote class="text-[15px] leading-[1.65]">${V[r][tr]}</blockquote></figure>`).join('')}`;
}

function view_person() {
	const mine = E.filter((e) => inv(e, who)),
		theirs = E.filter((e) => snt(e, who) && !inv(e, who));
	const by = rollup(mine.filter((e) => e.s.includes(who)).flatMap((e) => e.b));
	const along = rollup(mine.flatMap((e) => [...e.s, ...e.w].filter((p) => p !== who)));
	const facts = [
		mine.length && `${mine.length} ${mine.length === 1 ? 'step' : 'steps'}`,
		theirs.length && `sent others ${theirs.length} ${theirs.length === 1 ? 'time' : 'times'}`
	]
		.filter(Boolean)
		.join(' · ');
	return `${back_btn('all events')}
    <h1 class="mt-6 text-[28px] font-bold leading-tight tracking-tight">${A[who]}</h1>
    <p class="mt-1 ${tone}">${facts}</p>
    <div class="mt-4 grid gap-1.5 text-[13px]">
      ${mine.length ? `<p class="flex items-center gap-2">${line_icon('sent', C.sel)}their own path, numbered on the map</p><p class="flex items-center gap-2">${line_icon('went', C.sel)}travel between steps the verses do not describe</p>` : ''}
      ${theirs.length ? `<p class="flex items-center gap-2">${line_icon('sent', C.alt)}people they sent</p>` : ''}
    </div>
    ${by.length ? h2('sent by') + chips(by) : ''}
    ${along.length ? h2('traveled with') + chips(along) : ''}
    ${mine.length ? h2('the journey') + mine.map((e, j) => row(e, j + 1)).join('') : ''}
    ${theirs.length ? h2(`${A[who]} sent`) + theirs.map((e) => row(e, '●', true)).join('') : ''}`;
}

function view_place() {
	const here = E.filter((e) => at(e, spot));
	const groups = [
		['arrived here', (e) => e.t === spot && e.f !== spot],
		['left from here', (e) => e.f === spot && e.t !== spot],
		[`inside ${place(spot)}`, (e) => e.f === spot && e.t === spot],
		['passed through', (e) => e.v.includes(spot)]
	];
	return `${back_btn('all events')}
    <h1 class="mt-6 text-[28px] font-bold leading-tight tracking-tight">${place(spot)}</h1>
    <p class="mt-1 ${tone}">${here.length} ${here.length === 1 ? 'event' : 'events'}</p>
    ${groups
			.map(([t, f]) => {
				const es = here.filter(f);
				return es.length ? h2(`${t} · ${es.length}`) + es.map((e) => row(e)).join('') : '';
			})
			.join('')}`;
}

function view_all() {
	const count = (grp) => E.filter((e) => GROUP[e.k] === grp).length;
	const top_people = TRAVELERS.filter((p) => !['runner', 'messengers'].includes(p))
		.sort((a, b) => n_in(b) - n_in(a))
		.slice(0, 14)
		.map((p) => [p, n_in(p)]);
	const top_places = [...USED].sort((a, b) => WEIGHT[b] - WEIGHT[a]).slice(0, 12);
	return `<p class="text-[17px] leading-relaxed">every time someone in the new testament was sent, sent for, or told to go somewhere. who sent them, where they went, and the verses that say so.</p>
    <p class="mt-3 text-[13px] leading-relaxed ${tone}">click any line, place, dot or name. ← → step through events, space plays, esc goes back. pinch or ctrl + scroll zooms whatever is under your pointer: the map, the timeline, or this text.</p>
    ${h2('follow someone')}${chips(top_people)}
    ${h2('places')}<div class="flex flex-wrap gap-1.5">${top_places.map((id) => `<button data-l="${id}" class="${btn}">${place(id)}<span class="ml-1.5 tabular-nums opacity-50">${WEIGHT[id]}</span></button>`).join('')}</div>
    ${h2('key')}<div class="grid gap-2 text-[13px]">
      ${[
				['sent', 'sent, sent for, led as a prisoner'],
				['told', 'told or led to go'],
				['went', 'went, taken along, left behind'],
				['plan', 'planned or asked for, did not happen']
			]
				.map(
					([grp, t]) =>
						`<p class="flex items-center gap-2">${line_icon(grp)}<span class="flex-1">${t}</span><span class="tabular-nums ${tone}">${count(grp)}</span></p>`
				)
				.join('')}
      <p class="mt-1 leading-relaxed ${tone}">bigger dots are busier places. a line from above starts in heaven. a large ring means "all the world". sendings inside one town show as small rings when you select them. on the timeline, each row is someone who travels three or more times, and a vertical line joins people on the same trip.</p></div>
    <details class="group mt-8"><summary class="cursor-pointer list-none text-[13px] font-semibold ${tone}">what counts <span class="inline-block transition-transform group-open:rotate-90">›</span></summary>
      <div class="mt-2 grid gap-2 text-[13px] leading-relaxed ${tone}">
        <p><span class="font-medium text-[#0b0b0b] dark:text-white">in:</span> every real event where someone is sent, sent for, sent away or sent on their way. "go" commands and leadings of the spirit that point someone to a place or a person. prisoners handed from one ruler to another. trips that finish a sending, like reports back, messengers between churches, and co-workers named in the letters. plans and requests that did not happen are marked.</p>
        <p><span class="font-medium text-[#0b0b0b] dark:text-white">out:</span> parables, prophecies about the future, and teaching about sending. old testament stories retold (elijah, joseph, moses, rahab). things sent on their own, like letters, gifts and greetings. arrests, escapes, and "go in peace" goodbyes that name no place.</p>
        <p>dates are rough and follow common scholarly estimates. the bible gives almost none, so the order follows the story. places marked "not named" are left off the map.</p>
        <p>verses: bsb is the berean standard bible. ylt is young's literal translation (1898).</p>
      </div></details>
    ${ERA_GROUPS.map(([era, es]) => h2(`${ERAS[era]} · ${es.length}`) + es.map((e) => row(e)).join('')).join('')}`;
}

function render_side() {
	scroll_mem[view_key] = panel_el.scrollTop;
	view_key = sel != null ? `e${sel}` : who ? `p${who}` : spot ? `l${spot}` : 'all';
	panel_el.innerHTML =
		sel != null ? view_event() : who ? view_person() : spot ? view_place() : view_all();
	panel_el.scrollTop = scroll_mem[view_key] ?? 0;
	const card = $('card'),
		pill_btn = 'h-8 rounded-full px-3 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10';
	const close =
		'<button data-back aria-label="close" class="grid size-8 place-items-center rounded-full text-lg hover:bg-black/5 dark:hover:bg-white/10">×</button>';
	const dark_btn =
		'h-8 rounded-full bg-[#0b0b0b] px-3 text-white dark:bg-white dark:text-[#0b0b0b]';
	if (sel != null) {
		const c = seq(),
			j = c.indexOf(sel);
		card.innerHTML = `<p class="truncate text-xs ${tone}">${year(E[sel].y)} · ${route(E[sel])}</p><p class="mt-0.5 line-clamp-2 font-medium leading-snug">${E[sel].x}</p>
      <div class="mt-2 flex items-center gap-1"><button data-nav="-1" class="${pill_btn}" ${j > 0 ? '' : 'disabled'}>‹ prev</button><button data-nav="1" class="${pill_btn}" ${j >= 0 && j < c.length - 1 ? '' : 'disabled'}>next ›</button>
      <button data-details class="ml-auto ${dark_btn}">verses</button>${close}</div>`;
	} else if (who || spot) {
		card.innerHTML = `<div class="flex items-center gap-2"><p class="min-w-0 flex-1 truncate"><span class="${tone}">${who ? 'following' : 'place'}</span> <span class="font-medium">${who ? A[who] : place(spot)}</span></p><button data-details class="${dark_btn}">list</button>${close}</div>`;
	} else card.innerHTML = '';
	card.classList.toggle('hidden', !card.innerHTML);
}
const render = () => {
	render_side();
	paint();
};

// actions
function pick(i) {
	if (timer) stop();
	sel = i;
	if (i > cur) cur = N - 1;
	render();
	fit_view();
	reveal(i);
	animate(E[i], color_for(E[i]));
}
function follow(p) {
	stop();
	who = p || null;
	spot = null;
	sel = null;
	cur = N - 1;
	$('follow').value = who || '';
	render();
	fit_view();
	if (who) reveal(seq()[0]);
}
function pick_place(id) {
	stop();
	spot = id;
	who = null;
	sel = null;
	cur = N - 1;
	$('follow').value = '';
	render();
	fit_view();
}
function back() {
	if (sel != null) sel = null;
	else {
		who = null;
		spot = null;
		$('follow').value = '';
	}
	render();
	fit_view();
}
function reset() {
	stop();
	sel = null;
	who = null;
	spot = null;
	cur = N - 1;
	$('follow').value = '';
	render();
	fit_view();
	tl.scrollTo({ left: 0 });
}
function nav(d) {
	stop();
	const c = seq(),
		j = c.indexOf(sel);
	const next =
		sel == null
			? d > 0
				? c[0]
				: c.at(-1)
			: j < 0
				? d > 0
					? c.find((i) => i > sel)
					: c.findLast((i) => i < sel)
				: c[j + d];
	if (next != null) pick(next);
}
function stop() {
	clearInterval(timer);
	timer = null;
}
function tick() {
	const next = seq().find((i) => i > cur);
	if (next == null) {
		stop();
		return render();
	}
	const was = cur;
	cur = sel = next;
	render();
	if (who || spot) {
		if (was < 0) fit(places_of(seq().map((i) => E[i])));
	} else if (was < 0 || E[next].era !== E[was].era)
		fit(places_of(E.filter((e) => e.era === E[next].era)));
	reveal(next);
	animate(E[next], color_for(E[next]));
}
function play() {
	if (timer) {
		stop();
		return paint();
	}
	if (cur === N - 1 || seq().at(-1) <= cur) cur = -1;
	timer = setInterval(tick, 1600);
	tick();
}

// zoom whatever is under the pointer, never the page
const area_of = (t) => (t?.closest?.('#tlwrap') ? 'tl' : t?.closest?.('#panel') ? 'panel' : 'map');
function zoom_area(a, f, x, y) {
	if (a === 'tl') return zoom_tl(f, x);
	if (a === 'panel') {
		pz = f ? clamp(0.75, pz * f, 1.8) : 1;
		panel_el.style.zoom = pz;
		return;
	}
	if (!f) return fit_view();
	const r = box.getBoundingClientRect(),
		p = x == null ? [W / 2, H / 2] : [x - r.left, y - r.top];
	(x == null && !calm ? svg.transition().duration(250) : svg).call(zoom.scaleBy, f, p);
}
addEventListener(
	'pointermove',
	(ev) => {
		area = area_of(ev.target);
	},
	{ passive: true }
);
addEventListener(
	'wheel',
	(ev) => {
		const a = area_of(ev.target);
		if (ev.ctrlKey || ev.metaKey) {
			ev.preventDefault();
			if (a !== 'map' || !ev.target.closest('svg'))
				zoom_area(a, wheel_f(ev), ev.clientX, ev.clientY);
		} else if (a === 'tl' && lg.matches && Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
			ev.preventDefault();
			tl.scrollLeft += ev.deltaY;
		}
	},
	{ passive: false, capture: true }
);
addEventListener('keydown', (ev) => {
	if ((ev.ctrlKey || ev.metaKey) && ['=', '+', '-', '_', '0'].includes(ev.key)) {
		ev.preventDefault();
		return zoom_area(area, ev.key === '0' ? 0 : ev.key === '-' || ev.key === '_' ? 0.8 : 1.25);
	}
	if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest('select,input,textarea')) return;
	if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
		ev.preventDefault();
		nav(ev.key === 'ArrowRight' ? 1 : -1);
	} else if (ev.key === ' ' && !ev.target.closest('button,summary,a')) {
		ev.preventDefault();
		play();
	} else if (ev.key === 'Escape') back();
});
function pinch(el, fn) {
	let last = null;
	const two = (ev) => {
		const [a, b] = ev.touches;
		return {
			d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
			x: (a.clientX + b.clientX) / 2,
			y: (a.clientY + b.clientY) / 2
		};
	};
	el.addEventListener(
		'touchstart',
		(ev) => {
			last = ev.touches.length === 2 ? two(ev) : null;
		},
		{ passive: true }
	);
	el.addEventListener(
		'touchmove',
		(ev) => {
			if (ev.touches.length !== 2 || !last) return;
			ev.preventDefault();
			const now = two(ev);
			fn(now.d / last.d, now, now.x - last.x, now.y - last.y);
			last = now;
		},
		{ passive: false }
	);
	el.addEventListener(
		'touchend',
		(ev) => {
			last = ev.touches.length === 2 ? two(ev) : null;
		},
		{ passive: true }
	);
}
pinch(box, (f, c, dx, dy) => {
	if (lg.matches) return;
	const r = box.getBoundingClientRect();
	zoom.scaleBy(svg, f, [c.x - r.left, c.y - r.top]);
	zoom.translateBy(svg, dx / k, dy / k);
});
pinch($('tlwrap'), (f, c) => zoom_tl(f, c.x));
pinch(panel_el, (f) => zoom_area('panel', f));
let gesture = 1,
	touches = 0;
addEventListener(
	'touchstart',
	(ev) => {
		touches = ev.touches.length;
		hide_tip();
	},
	{ passive: true }
);
addEventListener(
	'touchend',
	(ev) => {
		touches = ev.touches.length;
	},
	{ passive: true }
);
addEventListener('gesturestart', (ev) => {
	ev.preventDefault();
	gesture = 1;
});
addEventListener('gesturechange', (ev) => {
	ev.preventDefault();
	if (!touches) zoom_area(area_of(ev.target), ev.scale / gesture, ev.clientX, ev.clientY);
	gesture = ev.scale;
});
document.documentElement.style.touchAction = 'pan-x pan-y';

document.addEventListener('click', (ev) => {
	const t = ev.target.closest(
		'[data-e],[data-p],[data-l],[data-back],[data-nav],[data-play],[data-reset],[data-tr],[data-mz],[data-tz],[data-details]'
	);
	if (!t) return;
	const d = t.dataset;
	if (d.e != null) pick(+d.e);
	else if (d.p != null) follow(d.p);
	else if (d.l != null) pick_place(d.l);
	else if (d.back != null) back();
	else if (d.nav != null) nav(+d.nav);
	else if (d.play != null) play();
	else if (d.reset != null) reset();
	else if (d.tr) {
		tr = d.tr;
		render();
	} else if (d.mz) zoom_area('map', +d.mz);
	else if (d.tz) zoom_tl(+d.tz);
	else if (d.details != null) panel_el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
});
panel_el.addEventListener('pointerover', (ev) => {
	if (ev.pointerType === 'touch') return;
	const r = ev.target.closest('[data-e]'),
		i = r ? +r.dataset.e : null;
	if (i !== hov) {
		hov = i;
		paint();
	}
});
panel_el.addEventListener('pointerleave', () => {
	if (hov != null) {
		hov = null;
		paint();
	}
});

const fsel = $('follow');
fsel.innerHTML =
	'<option value="">follow someone…</option>' +
	EVERYONE.map((p) => `<option value="${p}">${A[p]} · ${n_in(p) + n_by(p)}</option>`).join('');
fsel.onchange = () => follow(fsel.value);
$('stats').textContent =
	`${N} events · ${TRAVELERS.length} people and groups · ${USED.length} places`;
lg.onchange = () => {
	touch_mode();
	tl_layout();
	geo();
};
addEventListener('resize', () => tl_layout());
new ResizeObserver(() => layout_map()).observe(box);

tl_layout();
render();
land = topojson.feature(
	await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json')).json(),
	'land'
);
$('loading').remove();
layout_map();
