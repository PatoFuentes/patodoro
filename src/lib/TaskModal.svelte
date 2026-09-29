<script lang="ts">
	import { untrack } from 'svelte';
	import Modal from './Modal.svelte';

	let {
		initial,
		onstart,
		onclose
	}: { initial: string; onstart: (task: string) => void; onclose: () => void } = $props();

	let value = $state(untrack(() => initial));
	let input: HTMLInputElement | undefined = $state();

	$effect(() => {
		input?.focus();
		input?.select();
	});
</script>

<Modal title="¿En qué vas a trabajar?" {onclose}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onstart(value.trim());
		}}
	>
		<input
			bind:this={input}
			bind:value
			maxlength="80"
			placeholder="Nombre de la tarea (opcional)"
			autocomplete="off"
		/>
		<div class="actions">
			<button type="button" onclick={() => onstart('')}>Omitir</button>
			<button type="submit" class="primary">Iniciar</button>
		</div>
	</form>
</Modal>

<style>
	input {
		width: 100%;
		box-sizing: border-box;
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		border-radius: 0.6rem;
		color: #eee;
		padding: 0.9rem 1rem;
		font-size: 1.1rem;
	}
	input:focus {
		outline: none;
		border-color: #e63b2e;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	button {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #aaa;
		padding: 0.7rem 1.3rem;
		border-radius: 999px;
		cursor: pointer;
	}
	.primary {
		background: #e63b2e;
		border-color: #e63b2e;
		color: #fff;
	}
</style>
