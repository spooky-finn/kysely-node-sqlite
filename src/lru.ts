interface CacheItem<V> {
	value: V;
	expiry?: number;
}

export type Options<K, V> = {
	readonly maxAge?: number;
	readonly maxSize: number;
	onEviction?: (key: K, value: V) => void;
};

// We'll create a base class that doesn't extend Map to avoid the iterator issues
export class LRUBase<K, V> {
	#size = 0;
	#cache = new Map<K, CacheItem<V>>();
	#oldCache = new Map<K, CacheItem<V>>();
	#maxSize: number;
	#maxAge: number;
	#onEviction?: (key: K, value: V) => void;

	constructor(options: Options<K, V>) {
		if (!(options.maxSize && options.maxSize > 0)) {
			throw new TypeError("`maxSize` must be a number greater than 0");
		}

		if (typeof options.maxAge === "number" && options.maxAge === 0) {
			throw new TypeError("`maxAge` must be a number greater than 0");
		}

		this.#maxSize = options.maxSize;
		this.#maxAge = options.maxAge || Number.POSITIVE_INFINITY;
		this.#onEviction = options.onEviction;
	}

	protected get cache(): Map<K, CacheItem<V>> {
		return this.#cache;
	}

	protected get oldCache(): Map<K, CacheItem<V>> {
		return this.#oldCache;
	}

	#emitEvictions(cache: Map<K, CacheItem<V>>): void {
		if (typeof this.#onEviction !== "function") {
			return;
		}

		for (const [key, item] of cache) {
			this.#onEviction(key, item.value);
		}
	}

	#deleteIfExpired(key: K, item: CacheItem<V>): boolean {
		if (typeof item.expiry === "number" && item.expiry <= Date.now()) {
			if (typeof this.#onEviction === "function") {
				this.#onEviction(key, item.value);
			}

			return this.delete(key);
		}

		return false;
	}

	#getOrDeleteIfExpired(key: K, item: CacheItem<V>): V | undefined {
		const deleted = this.#deleteIfExpired(key, item);
		if (deleted === false) {
			return item.value;
		}
		return undefined;
	}

	#getItemValue(key: K, item: CacheItem<V>): V | undefined {
		return item.expiry ? this.#getOrDeleteIfExpired(key, item) : item.value;
	}

	#peek(key: K, cache: Map<K, CacheItem<V>>): V | undefined {
		const item = cache.get(key);
		if (!item) {
			return undefined;
		}
		return this.#getItemValue(key, item);
	}

	#set(key: K, value: CacheItem<V>): void {
		this.#cache.set(key, value);
		this.#size++;

		if (this.#size >= this.#maxSize) {
			this.#size = 0;
			this.#emitEvictions(this.#oldCache);
			this.#oldCache = this.#cache;
			this.#cache = new Map();
		}
	}

	#moveToRecent(key: K, item: CacheItem<V>): void {
		this.#oldCache.delete(key);
		this.#set(key, item);
	}

	*#entriesAscending(): IterableIterator<[K, CacheItem<V>]> {
		for (const item of this.#oldCache) {
			const [key, value] = item;
			if (!this.#cache.has(key)) {
				const deleted = this.#deleteIfExpired(key, value);
				if (deleted === false) {
					yield item;
				}
			}
		}

		for (const item of this.#cache) {
			const [key, value] = item;
			const deleted = this.#deleteIfExpired(key, value);
			if (deleted === false) {
				yield item;
			}
		}
	}

	get(key: K): V | undefined {
		if (this.#cache.has(key)) {
			const item = this.#cache.get(key);
			if (!item) {
				return undefined;
			}
			return this.#getItemValue(key, item);
		}

		if (this.#oldCache.has(key)) {
			const item = this.#oldCache.get(key);
			if (!item) {
				return undefined;
			}
			if (this.#deleteIfExpired(key, item) === false) {
				this.#moveToRecent(key, item);
				return item.value;
			}
		}
		return undefined;
	}

	set(key: K, value: V, options: { maxAge?: number } = {}): this {
		const maxAge = options.maxAge ?? this.#maxAge;

		const expiry =
			typeof maxAge === "number" && maxAge !== Number.POSITIVE_INFINITY
				? Date.now() + maxAge
				: undefined;

		if (this.#cache.has(key)) {
			this.#cache.set(key, {
				value,
				expiry,
			});
		} else {
			this.#set(key, { value, expiry });
		}

		return this;
	}

	has(key: K): boolean {
		if (this.#cache.has(key)) {
			const item = this.#cache.get(key);
			if (!item) {
				return false;
			}
			return !this.#deleteIfExpired(key, item);
		}

		if (this.#oldCache.has(key)) {
			const item = this.#oldCache.get(key);
			if (!item) {
				return false;
			}
			return !this.#deleteIfExpired(key, item);
		}

		return false;
	}

	peek(key: K): V | undefined {
		if (this.#cache.has(key)) {
			return this.#peek(key, this.#cache);
		}

		if (this.#oldCache.has(key)) {
			return this.#peek(key, this.#oldCache);
		}
		return undefined;
	}

	delete(key: K): boolean {
		const deleted = this.#cache.delete(key);
		if (deleted) {
			this.#size--;
		}

		return this.#oldCache.delete(key) || deleted;
	}

	clear(): void {
		this.#cache.clear();
		this.#oldCache.clear();
		this.#size = 0;
	}

	resize(maxSize: number): void {
		if (!(maxSize && maxSize > 0)) {
			throw new TypeError("`maxSize` must be a number greater than 0");
		}

		const items = [...this.#entriesAscending()];
		const removeCount = items.length - maxSize;
		if (removeCount < 0) {
			this.#cache = new Map(items);
			this.#oldCache = new Map();
			this.#size = items.length;
		} else {
			if (removeCount > 0) {
				this.#emitEvictions(new Map(items.slice(0, removeCount)));
			}

			this.#oldCache = new Map(items.slice(removeCount));
			this.#cache = new Map();
			this.#size = 0;
		}

		this.#maxSize = maxSize;
	}

	*entriesDescending(): IterableIterator<[K, V]> {
		const cacheItems = [...this.#cache];
		for (let i = cacheItems.length - 1; i >= 0; --i) {
			const item = cacheItems[i];
			if (item) {
				const [key, value] = item;
				const deleted = this.#deleteIfExpired(key, value);
				if (deleted === false) {
					yield [key, value.value];
				}
			}
		}

		const oldItems = [...this.#oldCache];
		for (let i = oldItems.length - 1; i >= 0; --i) {
			const item = oldItems[i];
			if (item) {
				const [key, value] = item;
				if (!this.#cache.has(key)) {
					const deleted = this.#deleteIfExpired(key, value);
					if (deleted === false) {
						yield [key, value.value];
					}
				}
			}
		}
	}

	*entriesAscending(): IterableIterator<[K, V]> {
		for (const [key, value] of this.#entriesAscending()) {
			yield [key, value.value];
		}
	}

	get size(): number {
		if (!this.#size) {
			return this.#oldCache.size;
		}

		let oldCacheSize = 0;
		for (const key of this.#oldCache.keys()) {
			if (!this.#cache.has(key)) {
				oldCacheSize++;
			}
		}

		return Math.min(this.#size + oldCacheSize, this.#maxSize);
	}

	get maxSize(): number {
		return this.#maxSize;
	}
}

// Create a proxy class that delegates to Map for iterator methods
export default class QuickLRU<K, V> implements Map<K, V> {
	readonly #base: LRUBase<K, V>;
	readonly #map: Map<K, V>;

	constructor(options: Options<K, V>) {
		this.#base = new LRUBase(options);
		this.#map = new Map();
	}

	clear(): void {
		this.#base.clear();
		this.#map.clear();
	}

	delete(key: K): boolean {
		return this.#base.delete(key);
	}

	forEach(
		callbackfn: (value: V, key: K, map: Map<K, V>) => void,
		thisArg?: unknown,
	): void {
		this.#map.forEach(callbackfn, thisArg);
	}

	get(key: K): V | undefined {
		return this.#base.get(key);
	}

	has(key: K): boolean {
		return this.#base.has(key);
	}

	set(key: K, value: V): this {
		this.#base.set(key, value);
		this.#map.set(key, value);
		return this;
	}

	get size(): number {
		return this.#base.size;
	}

	get maxSize(): number {
		return this.#base.maxSize;
	}

	peek(key: K): V | undefined {
		return this.#base.peek(key);
	}

	resize(maxSize: number): void {
		this.#base.resize(maxSize);
	}

	*entriesAscending(): IterableIterator<[K, V]> {
		yield* this.#base.entriesAscending();
	}

	*entriesDescending(): IterableIterator<[K, V]> {
		yield* this.#base.entriesDescending();
	}

	// Delegate Map iterator methods to the internal Map instance
	entries() {
		return this.#map.entries();
	}

	keys() {
		return this.#map.keys();
	}

	values() {
		return this.#map.values();
	}

	[Symbol.iterator]() {
		return this.#map[Symbol.iterator]();
	}

	get [Symbol.toStringTag](): string {
		return "QuickLRU";
	}
}
