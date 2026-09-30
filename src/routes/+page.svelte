<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => import('$lib/can.js'));
</script>

<svelte:head>
	<title>can</title>
</svelte:head>

<div class="h-dvh overflow-hidden bg-paper text-ink">
	<div
		id="stage"
		class="relative h-full w-full cursor-grab overflow-hidden bg-[radial-gradient(#262626_1px,transparent_1px)] bg-[size:24px_24px]"
	>
		<div id="world" class="absolute top-0 left-0 origin-top-left"></div>
	</div>
	<div class="fixed top-3 left-3 flex gap-2 font-sans text-sm">
		<button id="add" class="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700">+ pane</button>
		<button id="list" class="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700">+ list</button>
		<button id="new" class="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700"
			>new session</button
		>
		<button id="open" class="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700"
			>open session</button
		>
		<button id="sess" class="px-2 py-1 text-neutral-400 hover:text-white">no session</button>
		<button id="home" class="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700"
			>reset view</button
		>
		<a href="/sent" class="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700">sent</a>
	</div>
	<p class="fixed bottom-3 left-3 font-sans text-xs text-neutral-500">
		drag or scroll to pan · ctrl+scroll to zoom · double-click to add a pane
	</p>
</div>
