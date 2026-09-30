<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => import('$lib/sent.js'));
</script>

<svelte:head>
	<title>sent</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="flex flex-col bg-[#fcfcfb] font-[Inter,ui-sans-serif,system-ui,sans-serif] text-[15px] text-[#0b0b0b] antialiased lg:h-dvh lg:overflow-hidden dark:bg-[#1a1a19] dark:text-white"
>
	<header class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-4 pb-3 lg:px-6">
		<div class="min-w-0">
			<h1 class="text-[28px] leading-none font-bold tracking-tight">sent</h1>
			<p class="mt-1.5 text-[13px] text-[#52514e] dark:text-[#c3c2b7]">
				"as the father has sent me, so also i am sending you." john 20:21
			</p>
		</div>
		<p id="stats" class="text-[13px] text-[#52514e] lg:ml-auto dark:text-[#c3c2b7]"></p>
		<div class="flex w-full items-center gap-2 sm:w-auto">
			<select
				id="follow"
				aria-label="follow a person"
				class="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-2 text-sm sm:w-64 sm:flex-none dark:border-white/15 dark:bg-[#1a1a19]"
			></select>
			<div
				class="flex h-9 shrink-0 rounded-lg border border-black/10 p-0.5 text-sm dark:border-white/15"
			>
				<button data-tr="b" class="rounded-md px-2.5">bsb</button>
				<button data-tr="y" class="rounded-md px-2.5">ylt</button>
			</div>
		</div>
	</header>

	<div class="contents lg:flex lg:min-h-0 lg:flex-1">
		<div
			id="map"
			class="relative order-1 h-[58svh] min-h-80 overflow-hidden border-y border-black/5 lg:h-auto lg:min-h-0 lg:flex-1 lg:border-y-0 dark:border-white/5"
		>
			<p
				id="loading"
				class="absolute inset-0 grid place-items-center text-sm text-[#52514e] dark:text-[#c3c2b7]"
			>
				loading the map…
			</p>
			<div
				class="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white/90 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#242422]/90"
			>
				<button
					data-mz="1.6"
					aria-label="zoom in"
					class="grid size-9 place-items-center text-lg leading-none hover:bg-black/5 dark:hover:bg-white/10"
					>+</button
				>
				<button
					data-mz="0.625"
					aria-label="zoom out"
					class="grid size-9 place-items-center border-y border-black/10 text-lg leading-none hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
					>−</button
				>
				<button
					data-mz="0"
					aria-label="fit"
					class="grid size-9 place-items-center hover:bg-black/5 dark:hover:bg-white/10"
					><svg
						width="14"
						height="14"
						viewBox="0 0 14 14"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" /></svg
					></button
				>
			</div>
			<div
				id="card"
				class="absolute right-16 bottom-3 left-3 hidden rounded-xl border border-black/10 bg-white/95 p-3 text-sm shadow-sm backdrop-blur lg:!hidden dark:border-white/10 dark:bg-[#242422]/95"
			></div>
		</div>
		<aside
			id="panel"
			class="order-3 px-4 py-5 lg:w-[420px] lg:overflow-y-auto lg:border-l lg:border-black/10 lg:px-6 dark:lg:border-white/10"
		></aside>
	</div>

	<section id="tlwrap" class="order-2 border-t border-black/10 dark:border-white/10">
		<div class="flex items-center gap-2 px-4 py-2 lg:px-6">
			<button
				id="play"
				data-play
				class="h-8 shrink-0 rounded-full bg-[#0b0b0b] px-4 text-sm font-medium text-white dark:bg-white dark:text-[#0b0b0b]"
				>play</button
			>
			<button
				data-reset
				class="h-8 shrink-0 rounded-full px-3 text-sm text-[#52514e] hover:bg-black/5 dark:text-[#c3c2b7] dark:hover:bg-white/10"
				>reset</button
			>
			<p
				id="now"
				class="min-w-0 flex-1 truncate text-[13px] text-[#52514e] dark:text-[#c3c2b7]"
			></p>
			<div class="flex shrink-0 items-center text-[#52514e] dark:text-[#c3c2b7]">
				<button
					data-tz="0.8"
					aria-label="timeline zoom out"
					class="grid size-8 place-items-center rounded-full text-lg leading-none hover:bg-black/5 dark:hover:bg-white/10"
					>−</button
				>
				<button
					data-tz="1.25"
					aria-label="timeline zoom in"
					class="grid size-8 place-items-center rounded-full text-lg leading-none hover:bg-black/5 dark:hover:bg-white/10"
					>+</button
				>
				<button
					data-tz="0"
					class="h-8 rounded-full px-2 text-[13px] hover:bg-black/5 dark:hover:bg-white/10"
					>fit</button
				>
			</div>
		</div>
		<div class="flex">
			<div id="lanes" class="relative w-28 shrink-0 text-[11px] sm:w-36"></div>
			<div id="tl" class="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"></div>
		</div>
	</section>
</div>
<div
	id="tip"
	class="pointer-events-none fixed top-0 left-0 z-10 hidden max-w-72 rounded-lg bg-[#0b0b0b] px-3 py-2 text-[13px] leading-snug text-white shadow-lg dark:bg-white dark:text-[#0b0b0b]"
></div>
