window.__ModuleLoader__.load({
	id: "dsh-open-in-dsh",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region node_modules/@deepseek-ai/cosmokit/lib/index.js
		/** Return true when a value is `null` or `undefined`. */
		function isNullable(value) {
			return value === null || value === void 0;
		}
		/** Return true for non-array object values. */
		function isPlainObject(data) {
			return data && typeof data === "object" && !Array.isArray(data);
		}
		/** Filter object entries and return a new object. */
		function filterKeys(object, filter) {
			return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
		}
		/** Map object values while preserving the original key set. */
		function mapValues(object, transform) {
			return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
		}
		/** Pick selected keys from an object, optionally including `undefined` values. */
		function pick(source, keys, forced) {
			if (!keys) return { ...source };
			const result = {};
			for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
			return result;
		}
		/** Test values using `instanceof` with a `toStringTag` fallback. */
		function is(type, value) {
			if (arguments.length === 1) return (value) => is(type, value);
			return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
		}
		function isArrayBufferLike(value) {
			return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
		}
		function isArrayBufferSource(value) {
			return isArrayBufferLike(value) || ArrayBuffer.isView(value);
		}
		/** Binary source detection and base64/hex conversion helpers. */
		var Binary;
		(function(Binary) {
			Binary.is = isArrayBufferLike;
			Binary.isSource = isArrayBufferSource;
			function fromSource(source) {
				if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
				else return source;
			}
			Binary.fromSource = fromSource;
			function toBase64(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
				let binary = "";
				const bytes = new Uint8Array(source);
				for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
				return btoa(binary);
			}
			Binary.toBase64 = toBase64;
			function fromBase64(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
				return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
			}
			Binary.fromBase64 = fromBase64;
			function toHex(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
				return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
			}
			Binary.toHex = toHex;
			function fromHex(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
				const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
				const buffer = [];
				for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
				return Uint8Array.from(buffer).buffer;
			}
			Binary.fromHex = fromHex;
		})(Binary || (Binary = {}));
		Binary.fromBase64;
		Binary.toBase64;
		Binary.fromHex;
		Binary.toHex;
		/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
		function clone(source, refs = /* @__PURE__ */ new Map()) {
			if (!source || typeof source !== "object") return source;
			if (is("Date", source)) return new Date(source.valueOf());
			if (is("RegExp", source)) return new RegExp(source.source, source.flags);
			if (isArrayBufferLike(source)) return source.slice(0);
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			const cached = refs.get(source);
			if (cached) return cached;
			if (Array.isArray(source)) {
				const result = [];
				refs.set(source, result);
				source.forEach((value, index) => {
					result[index] = Reflect.apply(clone, null, [value, refs]);
				});
				return result;
			}
			const result = Object.create(Object.getPrototypeOf(source));
			refs.set(source, result);
			for (const key of Reflect.ownKeys(source)) {
				const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
				if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
				Reflect.defineProperty(result, key, descriptor);
			}
			return result;
		}
		/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
		function deepEqual(a, b, strict) {
			if (a === b) return true;
			if (!strict && isNullable(a) && isNullable(b)) return true;
			if (typeof a !== typeof b) return false;
			if (typeof a !== "object") return false;
			if (!a || !b) return false;
			function check(test, then) {
				return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
			}
			return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
				if (a.byteLength !== b.byteLength) return false;
				const viewA = new Uint8Array(a);
				const viewB = new Uint8Array(b);
				for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
				return true;
			}) ?? Object.keys({
				...a,
				...b
			}).every((key) => deepEqual(a[key], b[key], strict));
		}
		/** Time constants plus parsing and formatting helpers. */
		var Time;
		(function(Time) {
			Time.millisecond = 1;
			Time.second = 1e3;
			Time.minute = Time.second * 60;
			Time.hour = Time.minute * 60;
			Time.day = Time.hour * 24;
			Time.week = Time.day * 7;
			let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
			function setTimezoneOffset(offset) {
				timezoneOffset = offset;
			}
			Time.setTimezoneOffset = setTimezoneOffset;
			function getTimezoneOffset() {
				return timezoneOffset;
			}
			Time.getTimezoneOffset = getTimezoneOffset;
			function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
				if (typeof date === "number") date = new Date(date);
				if (offset === void 0) offset = timezoneOffset;
				return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
			}
			Time.getDateNumber = getDateNumber;
			function fromDateNumber(value, offset) {
				const date = new Date(value * Time.day);
				if (offset === void 0) offset = timezoneOffset;
				return new Date(+date + offset * Time.minute);
			}
			Time.fromDateNumber = fromDateNumber;
			const numeric = /\d+(?:\.\d+)?/.source;
			const timeRegExp = new RegExp(`^${[
				"w(?:eek(?:s)?)?",
				"d(?:ay(?:s)?)?",
				"h(?:our(?:s)?)?",
				"m(?:in(?:ute)?(?:s)?)?",
				"s(?:ec(?:ond)?(?:s)?)?"
			].map((unit) => `(${numeric}${unit})?`).join("")}$`);
			function parseTime(source) {
				const capture = timeRegExp.exec(source);
				if (!capture) return 0;
				return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
			}
			Time.parseTime = parseTime;
			function parseDate(date) {
				const parsed = parseTime(date);
				if (parsed) date = Date.now() + parsed;
				else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
				else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
				return date ? new Date(date) : /* @__PURE__ */ new Date();
			}
			Time.parseDate = parseDate;
			function format(ms) {
				const abs = Math.abs(ms);
				if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
				else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
				else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
				else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
				return ms + "ms";
			}
			Time.format = format;
			function toDigits(source, length = 2) {
				return source.toString().padStart(length, "0");
			}
			Time.toDigits = toDigits;
			function template(template, time = /* @__PURE__ */ new Date()) {
				return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
			}
			Time.template = template;
		})(Time || (Time = {}));
		//#endregion
		//#region node_modules/@deepseek-ai/schemastery/lib/index.mjs
		const kSchema = Symbol.for("schemastery");
		const kValidationError = Symbol.for("ValidationError");
		globalThis.__schemastery_index__ ??= 0;
		globalThis.__schemastery_refs__ = void 0;
		var ValidationError = class extends TypeError {
			options;
			name = "ValidationError";
			constructor(message, options) {
				let prefix = "$";
				for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
				else if (typeof segment === "number") prefix += "[" + segment + "]";
				else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
				if (prefix.startsWith(".")) prefix = prefix.slice(1);
				super((prefix === "$" ? "" : `${prefix} `) + message);
				this.options = options;
			}
			static is(error) {
				return !!error?.[kValidationError];
			}
		};
		Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
		const Schema = function(options) {
			const schema = function(data, options = {}) {
				return Schema.resolve(data, schema, options)[0];
			};
			if (options.refs) {
				const refs = mapValues(options.refs, (options) => new Schema(options));
				const getRef = (uid) => refs[uid];
				for (const key in refs) {
					const options = refs[key];
					options.sKey = getRef(options.sKey);
					options.inner = getRef(options.inner);
					options.list = options.list && options.list.map(getRef);
					options.dict = options.dict && mapValues(options.dict, getRef);
				}
				return refs[options.uid];
			}
			Object.assign(schema, options);
			if (typeof schema.callback === "string") try {
				schema.callback = new Function("return " + schema.callback)();
			} catch {}
			Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
			Object.setPrototypeOf(schema, Schema.prototype);
			schema.meta ||= {};
			schema.toString = schema.toString.bind(schema);
			return schema;
		};
		Schema.prototype = Object.create(Function.prototype);
		Schema.prototype[kSchema] = true;
		Object.defineProperty(Schema.prototype, "~standard", { get() {
			return {
				version: 1,
				vendor: "schemastery",
				validate: (value) => {
					try {
						return { value: Schema.resolve(value, this, {})[0] };
					} catch (error) {
						if (ValidationError.is(error)) return { issues: [{
							message: error.message,
							path: error.options.path
						}] };
						throw error;
					}
				}
			};
		} });
		Schema.ValidationError = ValidationError;
		Schema.prototype.toJSON = function toJSON() {
			if (globalThis.__schemastery_refs__) {
				globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
				return this.uid;
			}
			globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
			globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
			const result = {
				uid: this.uid,
				refs: globalThis.__schemastery_refs__
			};
			globalThis.__schemastery_refs__ = void 0;
			return result;
		};
		Schema.prototype.set = function set(key, value) {
			this.dict[key] = value;
			return this;
		};
		Schema.prototype.push = function push(value) {
			this.list.push(value);
			return this;
		};
		function mergeDesc(original, messages) {
			const result = typeof original === "string" ? { "": original } : { ...original };
			for (const locale in messages) {
				const value = messages[locale];
				if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
				else if (typeof value === "string") result[locale] = value;
			}
			return result;
		}
		function getInner(value) {
			return value?.$value ?? value?.$inner;
		}
		function extractKeys(data) {
			return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
		}
		Schema.prototype.i18n = function i18n(messages) {
			const schema = Schema(this);
			const desc = mergeDesc(schema.meta.description, messages);
			if (Object.keys(desc).length) schema.meta.description = desc;
			if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
				return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
			});
			if (schema.list) schema.list = schema.list.map((inner, index) => {
				return inner.i18n(mapValues(messages, (data = {}) => {
					if (Array.isArray(getInner(data))) return getInner(data)[index];
					if (Array.isArray(data)) return data[index];
					return extractKeys(data);
				}));
			});
			if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
				if (getInner(data)) return getInner(data);
				return extractKeys(data);
			}));
			if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
			return schema;
		};
		Schema.prototype.extra = function extra(key, value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		};
		for (const key of [
			"required",
			"disabled",
			"collapse",
			"hidden",
			"loose"
		]) Object.assign(Schema.prototype, { [key](value = true) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		Schema.prototype.deprecated = function deprecated() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "deprecated",
				type: "danger"
			});
			return schema;
		};
		Schema.prototype.experimental = function experimental() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "experimental",
				type: "warning"
			});
			return schema;
		};
		Schema.prototype.pattern = function pattern(regexp) {
			const schema = Schema(this);
			const pattern = pick(regexp, ["source", "flags"]);
			schema.meta = {
				...schema.meta,
				pattern
			};
			return schema;
		};
		Schema.prototype.simplify = function simplify(value) {
			if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
			if (isNullable(value)) return value;
			if (this.type === "object" || this.type === "dict") {
				const result = {};
				for (const key in value) {
					const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
					if (this.type === "dict" || !isNullable(item)) result[key] = item;
				}
				if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
				return result;
			} else if (this.type === "array" || this.type === "tuple") {
				const result = [];
				value.forEach((value, index) => {
					const schema = this.type === "array" ? this.inner : this.list[index];
					const item = schema ? schema.simplify(value) : value;
					result.push(item);
				});
				return result;
			} else if (this.type === "intersect") {
				const result = {};
				for (const item of this.list) Object.assign(result, item.simplify(value));
				return result;
			} else if (this.type === "union") for (const schema of this.list) try {
				Schema.resolve(value, schema, {});
				return schema.simplify(value);
			} catch {}
			return value;
		};
		Schema.prototype.toString = function toString(inline) {
			return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
		};
		Schema.prototype.role = function role(role, extra) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				role,
				extra
			};
			return schema;
		};
		for (const key of [
			"default",
			"link",
			"comment",
			"description",
			"max",
			"min",
			"step"
		]) Object.assign(Schema.prototype, { [key](value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		const resolvers = {};
		Schema.extend = function extend(type, resolve) {
			resolvers[type] = resolve;
		};
		Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
			if (!schema) return [data];
			if (options.ignore?.(data, schema)) return [data];
			if (isNullable(data) && schema.type !== "lazy") {
				if (schema.meta.required) throw new ValidationError(`missing required value`, options);
				let current = schema;
				let fallback = schema.meta.default;
				while (current?.type === "intersect" && isNullable(fallback)) {
					current = current.list[0];
					fallback = current?.meta.default;
				}
				if (isNullable(fallback)) return [data];
				data = clone(fallback);
			}
			const callback = resolvers[schema.type];
			if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
			try {
				return callback(data, schema, options, strict);
			} catch (error) {
				if (!schema.meta.loose) throw error;
				return [schema.meta.default];
			}
		};
		Schema.from = function from(source) {
			if (isNullable(source)) return Schema.any();
			else if ([
				"string",
				"number",
				"boolean"
			].includes(typeof source)) return Schema.const(source).required();
			else if (source[kSchema]) return source;
			else if (typeof source === "function") switch (source) {
				case String: return Schema.string().required();
				case Number: return Schema.number().required();
				case Boolean: return Schema.boolean().required();
				case Function: return Schema.function().required();
				default: return Schema.is(source).required();
			}
			else throw new TypeError(`cannot infer schema from ${source}`);
		};
		Schema.lazy = function lazy(builder) {
			const toJSON = () => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			};
			const schema = new Schema({
				type: "lazy",
				builder,
				inner: { toJSON }
			});
			return schema;
		};
		Schema.natural = function natural() {
			return Schema.number().step(1).min(0);
		};
		Schema.percent = function percent() {
			return Schema.number().step(.01).min(0).max(1).role("slider");
		};
		Schema.date = function date() {
			return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
				const date = new Date(value);
				if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
				return date;
			}, true)]);
		};
		Schema.regExp = function regExp(flag = "") {
			return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
				try {
					return new RegExp(value, flag);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)]);
		};
		Schema.arrayBuffer = function arrayBuffer(encoding) {
			return Schema.union([
				Schema.is(ArrayBuffer),
				Schema.is(SharedArrayBuffer),
				Schema.transform(Schema.any(), (value, options) => {
					if (Binary.isSource(value)) return Binary.fromSource(value);
					throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
				}, true),
				...encoding ? [Schema.transform(Schema.string(), (value, options) => {
					try {
						return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
					} catch (e) {
						throw new ValidationError(e.message, options);
					}
				}, true)] : []
			]);
		};
		Schema.extend("lazy", (data, schema, options, strict) => {
			if (!schema.inner[kSchema]) {
				schema.inner = schema.builder();
				schema.inner.meta = {
					...schema.meta,
					...schema.inner.meta
				};
			}
			return Schema.resolve(data, schema.inner, options, strict);
		});
		Schema.extend("any", (data) => {
			return [data];
		});
		Schema.extend("never", (data, _, options) => {
			throw new ValidationError(`expected nullable but got ${data}`, options);
		});
		Schema.extend("const", (data, { value }, options) => {
			if (deepEqual(data, value)) return [value];
			throw new ValidationError(`expected ${value} but got ${data}`, options);
		});
		function checkWithinRange(data, meta, description, options, skipMin = false) {
			const { max = Infinity, min = -Infinity } = meta;
			if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
			if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
		}
		Schema.extend("string", (data, { meta }, options) => {
			if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
			if (meta.pattern) {
				const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
				if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
			}
			checkWithinRange(data.length, meta, "string length", options);
			return [data];
		});
		function decimalShift(data, digits) {
			const str = data.toString();
			if (str.includes("e")) return data * Math.pow(10, digits);
			const index = str.indexOf(".");
			if (index === -1) return data * Math.pow(10, digits);
			const frac = str.slice(index + 1);
			const integer = str.slice(0, index);
			if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
			return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
		}
		function isMultipleOf(data, min, step) {
			step = Math.abs(step);
			if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
			const index = step.toString().indexOf(".");
			const digits = step.toString().slice(index + 1).length;
			return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
		}
		Schema.extend("number", (data, { meta }, options) => {
			if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
			checkWithinRange(data, meta, "number", options);
			const { step } = meta;
			if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
			return [data];
		});
		Schema.extend("boolean", (data, _, options) => {
			if (typeof data === "boolean") return [data];
			throw new ValidationError(`expected boolean but got ${data}`, options);
		});
		Schema.extend("bitset", (data, { bits, meta }, options) => {
			let value = 0, keys = [];
			if (typeof data === "number") {
				value = data;
				for (const key in bits) if (data & bits[key]) keys.push(key);
			} else if (Array.isArray(data)) {
				keys = data;
				for (const key of keys) {
					if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
					if (key in bits) value |= bits[key];
				}
			} else throw new ValidationError(`expected number or array but got ${data}`, options);
			if (value === meta.default) return [value];
			return [value, keys];
		});
		Schema.extend("function", (data, _, options) => {
			if (typeof data === "function") return [data];
			throw new ValidationError(`expected function but got ${data}`, options);
		});
		Schema.extend("is", (data, { constructor }, options) => {
			if (typeof constructor === "function") {
				if (data instanceof constructor) return [data];
				throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
			} else {
				if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
				let prototype = Object.getPrototypeOf(data);
				while (prototype) {
					if (prototype.constructor?.name === constructor) return [data];
					prototype = Object.getPrototypeOf(prototype);
				}
				throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			}
		});
		function property(data, key, schema, options) {
			try {
				const [value, adapted] = Schema.resolve(data[key], schema, {
					...options,
					path: [...options.path || [], key]
				});
				if (adapted !== void 0) data[key] = adapted;
				return value;
			} catch (e) {
				if (!options?.autofix) throw e;
				delete data[key];
				return schema.meta.default;
			}
		}
		Schema.extend("array", (data, { inner, meta }, options) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
			return [data.map((_, index) => property(data, index, inner, options))];
		});
		Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in data) {
				let rKey;
				try {
					rKey = Schema.resolve(key, sKey, options)[0];
				} catch (error) {
					if (strict) continue;
					throw error;
				}
				result[rKey] = property(data, key, inner, options);
				data[rKey] = data[key];
				if (key !== rKey) delete data[key];
			}
			return [result];
		});
		Schema.extend("tuple", (data, { list }, options, strict) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			const result = list.map((inner, index) => property(data, index, inner, options));
			if (strict) return [result];
			result.push(...data.slice(list.length));
			return [result];
		});
		function merge(result, data) {
			for (const key in data) {
				if (key in result) continue;
				result[key] = data[key];
			}
		}
		Schema.extend("object", (data, { dict }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in dict) {
				const value = property(data, key, dict[key], options);
				if (!isNullable(value) || key in data) result[key] = value;
			}
			if (!strict) merge(result, data);
			return [result];
		});
		Schema.extend("union", (data, { list, toString }, options, strict) => {
			const messages = [];
			for (const inner of list) try {
				return Schema.resolve(data, inner, options, strict);
			} catch (error) {
				messages.push(error);
			}
			throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		});
		Schema.extend("intersect", (data, { list, toString }, options, strict) => {
			if (!list.length) return [data];
			let result;
			for (const inner of list) {
				const value = Schema.resolve(data, inner, options, true)[0];
				if (isNullable(value)) continue;
				if (isNullable(result)) result = value;
				else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
				else if (typeof value === "object") merge(result ??= {}, value);
				else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
			}
			if (!strict && isPlainObject(data)) merge(result, data);
			return [result];
		});
		Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
			const [result, adapted = data] = Schema.resolve(data, inner, options, true);
			if (preserve) return [callback(result)];
			else return [callback(result), callback(adapted)];
		});
		const formatters = {};
		function defineMethod(name, keys, format) {
			formatters[name] = format;
			Object.assign(Schema, { [name](...args) {
				const schema = new Schema({ type: name });
				keys.forEach((key, index) => {
					switch (key) {
						case "sKey":
							schema.sKey = args[index] ?? Schema.string();
							break;
						case "inner":
							schema.inner = Schema.from(args[index]);
							break;
						case "list":
							schema.list = args[index].map(Schema.from);
							break;
						case "dict":
							schema.dict = mapValues(args[index], Schema.from);
							break;
						case "bits":
							schema.bits = {};
							for (const key in args[index]) {
								if (typeof args[index][key] !== "number") continue;
								schema.bits[key] = args[index][key];
							}
							break;
						case "callback": {
							const callback = schema.callback = args[index];
							callback["toJSON"] ||= () => callback.toString();
							break;
						}
						case "constructor": {
							const constructor = schema.constructor = args[index];
							if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
							break;
						}
						default: schema[key] = args[index];
					}
				});
				if (name === "object" || name === "dict") schema.meta.default = {};
				else if (name === "array" || name === "tuple") schema.meta.default = [];
				else if (name === "bitset") schema.meta.default = 0;
				return schema;
			} });
		}
		defineMethod("is", ["constructor"], ({ constructor }) => {
			if (typeof constructor === "function") return constructor.name;
			else return constructor;
		});
		defineMethod("any", [], () => "any");
		defineMethod("never", [], () => "never");
		defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
		defineMethod("string", [], () => "string");
		defineMethod("number", [], () => "number");
		defineMethod("boolean", [], () => "boolean");
		defineMethod("bitset", ["bits"], () => "bitset");
		defineMethod("function", [], () => "function");
		defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
		defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
		defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
		defineMethod("object", ["dict"], ({ dict }) => {
			if (Object.keys(dict).length === 0) return "{}";
			return `{ ${Object.entries(dict).map(([key, inner]) => {
				return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
			}).join(", ")} }`;
		});
		defineMethod("union", ["list"], ({ list }, inline) => {
			const result = list.map(({ toString: format }) => format()).join(" | ");
			return inline ? `(${result})` : result;
		});
		defineMethod("intersect", ["list"], ({ list }) => {
			return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
		});
		defineMethod("transform", [
			"inner",
			"callback",
			"preserve"
		], ({ inner }, isInner) => inner.toString(isInner));
		//#endregion
		//#region src/shared/settings.ts
		/** Shared Host/Client vocabulary for the shell-integration preference. */
		/** Settings namespace owning the integration switch (paired key with the browser card). */
		const SHELL_SETTINGS_NAMESPACE = "dsh-shell-integration";
		/** Query parameter the browser half interprets as an open-workspace request. */
		const DEEP_LINK_QUERY = "dsh-open";
		Schema.object({
			enabled: Schema.boolean().default(false),
			removed: Schema.boolean().default(false)
		});
		//#endregion
		//#region src/client/card-controller.ts
		/**
		* Card controller: mirrors the bound `dsh-shell-integration` settings scope
		* into a snapshot store and writes the switch or the delete request
		* immediately (like a preference row) instead of staging a multi-field draft.
		*/
		/**
		* Bridge one settings scope onto the expandable integration card.
		* @param scope - bound settings scope for the integration namespace.
		*/
		var ShellIntegrationCardController = class {
			scope;
			store;
			unsubscribe;
			action = "none";
			failed = false;
			disposed = false;
			/** Invoked once a permanent uninstall was persisted (card should vanish). */
			onPurged;
			/** @param scope - bound settings scope for the integration namespace. */
			constructor(scope) {
				this.scope = scope;
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = scope.subscribe(() => {
					this.publish();
				});
			}
			/**
			* Register a callback that runs after a permanent uninstall was persisted,
			* so the registration side can drop the settings-card entry immediately.
			* @param callback - runs once, at most.
			*/
			afterPurge(callback) {
				this.onPurged = callback;
			}
			/** Stop observing settings and suppress late write settlements. */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.unsubscribe();
			}
			/** Build the renderer face for this card. */
			inject() {
				return {
					hooks: { shellIntegration: this.store },
					setEnabled: (enabled) => {
						this.setEnabled(enabled);
					},
					purge: () => this.purge()
				};
			}
			/**
			* Flip the quick-open switch. Once the plugin is uninstalled (`removed`) the
			* card is gone and no re-enable path exists — a deliberate reinstall is a
			* fresh mount, not a switch flip.
			*/
			async setEnabled(enabled) {
				const snapshot = this.scope.getSnapshot();
				if (!this.writableSnapshot(snapshot)) return;
				if (snapshot.value?.removed === true) return;
				if (snapshot.value?.enabled === enabled) return;
				this.begin("enabled");
				try {
					await this.scope.set("enabled", enabled);
				} catch {
					this.failed = true;
				}
				this.settle();
			}
			/**
			* Request the permanent uninstall: persist `removed` — the Host then
			* unregisters every menu, stops the tray, deletes the generated scripts,
			* removes its own mount rows, and deletes the installed files. Returns
			* whether the request was persisted.
			*/
			async purge() {
				const snapshot = this.scope.getSnapshot();
				if (!this.writableSnapshot(snapshot)) return false;
				if (snapshot.value?.removed === true) return true;
				this.begin("purge");
				try {
					await this.scope.set("removed", true);
					this.onPurged?.();
					return true;
				} catch {
					this.failed = true;
					return false;
				} finally {
					this.settle();
				}
			}
			/** Whether a snapshot allows a write and none is in flight. */
			writableSnapshot(snapshot) {
				return snapshot.status === "ready" && snapshot.writable && this.action === "none";
			}
			begin(action) {
				this.action = action;
				this.failed = false;
				this.publish();
			}
			settle() {
				this.action = "none";
				this.publish();
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					saving: this.action !== "none",
					failed: this.failed,
					enabled: snapshot.value?.enabled ?? false,
					removed: snapshot.value?.removed === true
				};
			}
			publish() {
				if (this.disposed) return;
				this.store.set(this.projection());
			}
		};
		//#endregion
		//#region \0dsh-css:D:\DSH\dsh-shell-integration\src\client\Overlay.module.css.mjs
		const css$1 = "._VFQfW_backdrop{z-index:1000;background:var(--dsw-alias-bg-mask-1);-webkit-backdrop-filter:var(--dsw-mask-blur);justify-content:center;align-items:center;padding:24px;display:flex;position:fixed;inset:0}._VFQfW_card{background:var(--dsw-alias-bg-layer-2);width:min(380px,100%);max-height:calc(100vh - 48px);box-shadow:var(--dsw-elevation-prominent);border:0;border-radius:24px;flex-direction:column;padding:22px 24px 24px;display:flex;overflow:hidden}._VFQfW_title{color:var(--dsw-alias-label-primary);flex:none;margin:0;font-size:16px;font-weight:500;line-height:24px}._VFQfW_prompt{color:var(--dsw-alias-label-secondary);flex:none;margin:10px 0 0;font-size:14px;line-height:22px}._VFQfW_path{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-4);color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);word-break:break-all;border-radius:8px;flex:none;margin-top:8px;padding:8px 10px;font-size:12px;line-height:18px}._VFQfW_status{min-height:16px;color:var(--dsw-alias-label-tertiary);flex:none;margin:12px 0 0;font-size:12px;line-height:16px}._VFQfW_error{color:var(--dsw-alias-state-error-primary)}._VFQfW_actions{flex:none;justify-content:flex-end;align-items:center;gap:8px;margin-top:22px;display:flex}._VFQfW_button{appearance:none;min-width:80px;height:36px;font:inherit;cursor:pointer;border:none;border-radius:18px;justify-content:center;align-items:center;gap:4px;padding:0 16px;font-size:14px;line-height:22px;display:inline-flex}._VFQfW_button:disabled{cursor:not-allowed;opacity:.4}._VFQfW_button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}._VFQfW_secondary{color:var(--dsw-alias-label-primary);background:0 0}._VFQfW_secondary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}._VFQfW_primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}._VFQfW_primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}._VFQfW_danger{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}._VFQfW_danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 86%, black)}";
		const tagId$1 = "dsh-open-in-dsh/Overlay.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-open-in-dsh";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var Overlay_module_css_default = {
			"status": "_VFQfW_status",
			"prompt": "_VFQfW_prompt",
			"secondary": "_VFQfW_secondary",
			"backdrop": "_VFQfW_backdrop",
			"title": "_VFQfW_title",
			"primary": "_VFQfW_primary",
			"danger": "_VFQfW_danger",
			"card": "_VFQfW_card",
			"error": "_VFQfW_error",
			"button": "_VFQfW_button",
			"actions": "_VFQfW_actions",
			"path": "_VFQfW_path"
		};
		//#endregion
		//#region src/client/overlay.ts
		/**
		* Centered confirmation overlay, built with plain DOM so no extra renderer
		* dependency rides the card bundle. Shared by the `?dsh-open=<path>` deep-link
		* prompt and the card's uninstall confirmation.
		*/
		/** Join class names, dropping empty values (css-module lookups may be undefined under noUncheckedIndexedAccess). */
		function cls$1(...parts) {
			return parts.filter((part) => part !== void 0 && part.length > 0).join(" ");
		}
		let dialogSequence = 0;
		/**
		* Show one centered confirmation dialog and resolve when it closes (either
		* the confirm action succeeded or the user cancelled). Escape and a backdrop
		* click cancel; Escape also fires when the confirm button is focused.
		* @param options - copy and the confirm action.
		* @returns a promise settling once the dialog is removed.
		*/
		function showConfirmOverlay(options) {
			return new Promise((resolveClose) => {
				if (typeof document === "undefined") {
					resolveClose();
					return;
				}
				const titleId = `dsh-confirm-title-${dialogSequence++}`;
				const backdrop = document.createElement("div");
				backdrop.className = cls$1(Overlay_module_css_default.backdrop);
				backdrop.setAttribute("role", "dialog");
				backdrop.setAttribute("aria-modal", "true");
				backdrop.setAttribute("aria-labelledby", titleId);
				const card = document.createElement("div");
				card.className = cls$1(Overlay_module_css_default.card);
				const title = document.createElement("div");
				title.id = titleId;
				title.className = cls$1(Overlay_module_css_default.title);
				title.textContent = options.title;
				card.append(title);
				if (options.prompt !== void 0) {
					const prompt = document.createElement("div");
					prompt.className = cls$1(Overlay_module_css_default.prompt);
					prompt.textContent = options.prompt;
					card.append(prompt);
				}
				if (options.body !== void 0) {
					const body = document.createElement("div");
					body.className = cls$1(Overlay_module_css_default.path);
					body.textContent = options.body;
					card.append(body);
				}
				const status = document.createElement("div");
				status.className = cls$1(Overlay_module_css_default.status);
				status.setAttribute("role", "status");
				const actions = document.createElement("div");
				actions.className = cls$1(Overlay_module_css_default.actions);
				const cancelButton = document.createElement("button");
				cancelButton.type = "button";
				cancelButton.className = cls$1(Overlay_module_css_default.button, Overlay_module_css_default.secondary);
				cancelButton.textContent = options.cancel;
				const confirmButton = document.createElement("button");
				confirmButton.type = "button";
				confirmButton.className = cls$1(Overlay_module_css_default.button, options.danger === true ? Overlay_module_css_default.danger : Overlay_module_css_default.primary);
				confirmButton.textContent = options.accept;
				actions.append(cancelButton, confirmButton);
				card.append(status, actions);
				backdrop.append(card);
				document.body.append(backdrop);
				confirmButton.focus();
				let closed = false;
				const close = () => {
					if (closed) return;
					closed = true;
					document.removeEventListener("keydown", onKeyDown);
					backdrop.remove();
					resolveClose();
				};
				const cancel = () => {
					close();
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") cancel();
				};
				document.addEventListener("keydown", onKeyDown);
				backdrop.addEventListener("mousedown", (event) => {
					if (event.target === backdrop) cancel();
				});
				const confirm = async () => {
					confirmButton.disabled = true;
					cancelButton.disabled = true;
					status.textContent = options.working;
					if (await options.run()) {
						close();
						return;
					}
					status.textContent = options.failed;
					status.className = cls$1(Overlay_module_css_default.status, Overlay_module_css_default.error);
					confirmButton.disabled = false;
					cancelButton.disabled = false;
				};
				confirmButton.addEventListener("click", () => {
					confirm();
				});
				cancelButton.addEventListener("click", cancel);
			});
		}
		//#endregion
		//#region src/client/deeplink.ts
		/** How long to wait for the workspace mirror to include a fresh row. */
		const MIRROR_TIMEOUT_MS = 4e3;
		/** How long to wait for the client services to be provided. */
		const SERVICE_TIMEOUT_MS = 1e4;
		function delay(ms) {
			return new Promise((resolvePromise) => {
				setTimeout(resolvePromise, ms);
			});
		}
		/** Wait until a client context service is provided (apply order is unconstrained). */
		async function waitForService(ctx, name, timeoutMs = SERVICE_TIMEOUT_MS) {
			const deadline = Date.now() + timeoutMs;
			for (;;) {
				const service = ctx.get(name);
				if (service !== void 0) return service;
				if (Date.now() >= deadline) return void 0;
				await delay(120);
			}
		}
		/**
		* Open (create or enter) a workspace for the deep-linked folder.
		* @param ctx - client context.
		* @param folder - absolute folder path from the launcher.
		* @returns whether the workspace was opened.
		*/
		async function openWorkspaceFromPath(ctx, folder) {
			const workspaces = await waitForService(ctx, "workspaces");
			if (workspaces === void 0) {
				console.warn("[dsh-open-in-dsh] workspaces service unavailable; cannot open folder");
				return false;
			}
			const ui = await waitForService(ctx, "uiWorkspace");
			if (ui === void 0) {
				console.warn("[dsh-open-in-dsh] uiWorkspace service unavailable");
				return false;
			}
			let workspaceId;
			try {
				workspaceId = (await workspaces.create({ path: folder })).workspaceId;
			} catch (error) {
				console.warn(`[dsh-open-in-dsh] workspace create failed: ${String(error)}`);
				return false;
			}
			if (!await waitForWorkspace(workspaces, workspaceId)) {
				console.warn(`[dsh-open-in-dsh] workspace ${workspaceId} not mirrored in time`);
				return false;
			}
			ui.startSession(workspaceId);
			return true;
		}
		/** Poll the workspace mirror until it includes the created row. */
		async function waitForWorkspace(workspaces, workspaceId) {
			const deadline = Date.now() + MIRROR_TIMEOUT_MS;
			for (;;) {
				const items = workspaces.list?.getSnapshot?.().items;
				if (Array.isArray(items) && items.some((item) => item.workspaceId === workspaceId)) return true;
				if (Date.now() >= deadline) return false;
				await delay(80);
			}
		}
		/** Copy for the deep-link confirmation overlay (kept tiny; no locale plumbing needed). */
		function pickCopy() {
			return typeof navigator !== "undefined" && /^zh/i.test(navigator.language ?? "") ? {
				title: "在 DSH 中打开",
				prompt: "是否将以下目录添加为工作区？",
				accept: "确定",
				cancel: "取消",
				working: "正在创建并进入工作区…",
				failed: "打开失败，请重试。"
			} : {
				title: "Open in DSH",
				prompt: "Add the following directory as a workspace?",
				accept: "Confirm",
				cancel: "Cancel",
				working: "Creating and entering the workspace…",
				failed: "Failed to open. Please retry."
			};
		}
		/** Read the single-use deep-link target, if present. */
		function readDeepLinkTarget() {
			if (typeof window === "undefined") return void 0;
			const target = new URLSearchParams(window.location.search).get(DEEP_LINK_QUERY);
			return target === null || target.length === 0 ? void 0 : target;
		}
		/** Remove the deep-link query so a reload never re-enters the folder. */
		function clearDeepLinkTarget() {
			if (typeof window === "undefined" || window.history?.replaceState === void 0) return;
			window.history.replaceState(null, "", window.location.pathname + window.location.hash);
		}
		/**
		* Handle a deep link found on the current page by asking the user first:
		* confirm -> open the folder as a workspace; cancel -> open DSH normally.
		* Safe no-op when no deep link is present or the DOM is unavailable.
		* @param ctx - client context.
		*/
		async function handleWorkspaceDeepLink(ctx) {
			const folder = readDeepLinkTarget();
			if (folder === void 0 || typeof document === "undefined") return;
			await showConfirmOverlay({
				...pickCopy(),
				body: folder,
				run: () => openWorkspaceFromPath(ctx, folder)
			});
			clearDeepLinkTarget();
		}
		//#endregion
		//#region src/client/locales.ts
		/** Browser copy for the shell-integration settings card. */
		/** Locale namespace owning the card copy. */
		const LOCALE_NS = "dshShellIntegration";
		/** Chinese card copy. */
		const zh = {
			title: "DSH 快捷开启",
			expandLabel: "展开或收起快捷开启设置",
			toggleLabel: "启用“在 DSH 中打开”文件夹右键菜单",
			enabledTag: "已启用",
			disabledTag: "已停用",
			deleteLabel: "彻底删除",
			deleteTitle: "永久删除插件“DSH 快捷开启”？",
			deletePrompt: "将删除：注册表右键菜单、系统托盘、全部已生成的脚本与日志、本设置卡片，以及该插件的安装文件；插件自身的装载条目也会被移除，DSH 重启后不再加载。此操作不可撤销，如需再次使用请重新安装插件。",
			accept: "永久删除",
			cancel: "取消",
			working: "正在删除…",
			saving: "正在保存…",
			failed: "操作失败，请重试。"
		};
		/** English card copy. */
		const en = {
			title: "DSH quick open",
			expandLabel: "Expand or collapse quick-open settings",
			toggleLabel: "Enable the “Open in DSH” folder context menu",
			enabledTag: "Enabled",
			disabledTag: "Disabled",
			deleteLabel: "Delete",
			deleteTitle: "Permanently delete the “DSH quick open” plugin?",
			deletePrompt: "Deletes the Explorer context-menu entries, the system tray, every generated script and log, this settings card, and the plugin's installed files; the plugin's own mount rows are removed too, so DSH will not load it again after a restart. This cannot be undone — reinstall the plugin to use it again.",
			accept: "Delete permanently",
			cancel: "Cancel",
			working: "Removing…",
			saving: "Saving…",
			failed: "Action failed. Please retry."
		};
		//#endregion
		//#region \0dsh-css:D:\DSH\dsh-shell-integration\src\client\ShellIntegrationCard.module.css.mjs
		const css = ".J3Q77G_card{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;list-style:none;transition:border-color .16s,background .16s}.J3Q77G_card:hover{border-color:var(--dsw-alias-label-dimmed)}.J3Q77G_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.J3Q77G_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:10px;padding:14px 16px;display:flex}.J3Q77G_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.J3Q77G_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.J3Q77G_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.J3Q77G_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s;display:block}.J3Q77G_chevronOpen{transform:rotate(180deg)}.J3Q77G_tag{background:var(--dsw-alias-bg-layer-1);min-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:5px;flex:none;align-items:center;padding:1px 6px;font-size:11px;line-height:16px;display:inline-flex}.J3Q77G_tag[data-kind=enabled]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary)}.J3Q77G_body{border-top:.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:10px}.J3Q77G_row{justify-content:space-between;align-items:center;gap:16px;margin-top:12px;display:flex}.J3Q77G_rowLabel{min-width:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5}.J3Q77G_footer{border-top:.5px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:10px;margin-top:12px;padding-top:10px;display:flex}.J3Q77G_spacer,.J3Q77G_note,.J3Q77G_failed{flex:1;min-width:0;margin:0;font-size:12px;line-height:1.5}.J3Q77G_spacer{flex:1}.J3Q77G_note{color:var(--dsw-alias-label-secondary)}.J3Q77G_failed{color:var(--dsw-alias-label-error)}.J3Q77G_danger{appearance:none;font:inherit;cursor:pointer;color:var(--dsw-alias-state-error-primary);background:0 0;border:1px solid #0000;border-radius:8px;flex:none;padding:5px 14px;font-size:13px;line-height:1.5}.J3Q77G_danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent)}.J3Q77G_danger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.J3Q77G_danger:disabled{opacity:.4;cursor:default}.J3Q77G_switch{border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-module-platform);cursor:pointer;border-radius:999px;flex:none;width:36px;height:20px;padding:0;transition:background .15s,border-color .15s;position:relative}.J3Q77G_switch:disabled{opacity:.4;cursor:default}.J3Q77G_switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.J3Q77G_switchOn{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill)}.J3Q77G_thumb{background:var(--dsw-alias-label-primary-foreground);border-radius:50%;width:16px;height:16px;transition:left .15s;position:absolute;top:1px;left:1px}.J3Q77G_switchOn .J3Q77G_thumb{left:17px}";
		const tagId = "dsh-open-in-dsh/ShellIntegrationCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-open-in-dsh";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ShellIntegrationCard_module_css_default = {
			"body": "J3Q77G_body",
			"note": "J3Q77G_note",
			"spacer": "J3Q77G_spacer",
			"rowLabel": "J3Q77G_rowLabel",
			"danger": "J3Q77G_danger",
			"headText": "J3Q77G_headText",
			"switchOn": "J3Q77G_switchOn",
			"chevronOpen": "J3Q77G_chevronOpen",
			"name": "J3Q77G_name",
			"header": "J3Q77G_header",
			"chevron": "J3Q77G_chevron",
			"footer": "J3Q77G_footer",
			"thumb": "J3Q77G_thumb",
			"cardOpen": "J3Q77G_cardOpen",
			"switch": "J3Q77G_switch",
			"tag": "J3Q77G_tag",
			"row": "J3Q77G_row",
			"failed": "J3Q77G_failed",
			"card": "J3Q77G_card"
		};
		//#endregion
		//#region src/client/ShellIntegrationCard.tsx
		/**
		* Settings card: "DSH 快捷开启". Rendered by the Plugins settings partition
		* under the `settings.plugin.item` key equal to the namespace this card edits
		* (`dsh-shell-integration`), matching Host-side registration.
		*
		* The card mirrors the Plugins block's own card chrome (name + state chip +
		* chevron header, disclosing controls in place): the header toggles a body
		* that holds the quick-open switch and the "彻底删除" (delete) action. The
		* trailing chip reports the live state (已启用 / 已停用). Deleting is a real
		* uninstall, not a disable: it asks through a centered confirmation overlay
		* and, on confirm, persists `removed` — the Host then removes every
		* context-menu entry, stops the tray, deletes the generated scripts/logs and
		* installed files, and removes this plugin's own mount rows so it never loads
		* again. As soon as `removed` lands the card unmounts itself (and the
		* registration side drops the slot entry), so no placeholder remains.
		*/
		/** Join class names, dropping empty values (css-module lookups may be undefined under noUncheckedIndexedAccess). */
		function cls(...parts) {
			return parts.filter((part) => part !== void 0 && part.length > 0).join(" ");
		}
		/**
		* Outline chevron-down glyph identical to the Plugins block's card chevron
		* (`IconChevronDownOutline14`); the header rotates it 180° while open.
		*/
		function ChevronDown({ className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				className,
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
					fill: "currentColor"
				})
			});
		}
		/**
		* Render the shell-integration card.
		* @param props - composed slot props.
		* @returns the card, or null when the Host does not serve it or the plugin
		* was permanently uninstalled (`removed`).
		*/
		function ShellIntegrationCard(props) {
			const { t } = props;
			const state = props.useShellIntegration((snapshot) => snapshot);
			const bodyId = (0, react.useId)();
			const [open, setOpen] = (0, react.useState)(false);
			if (!state.available || state.removed) return null;
			const chipState = state.enabled ? {
				label: t("enabledTag"),
				kind: "enabled"
			} : {
				label: t("disabledTag"),
				kind: "disabled"
			};
			const switchClass = state.enabled ? cls(ShellIntegrationCard_module_css_default.switch, ShellIntegrationCard_module_css_default.switchOn) : ShellIntegrationCard_module_css_default.switch;
			const confirmDelete = async () => {
				await showConfirmOverlay({
					title: t("deleteTitle"),
					prompt: t("deletePrompt"),
					accept: t("accept"),
					cancel: t("cancel"),
					working: t("working"),
					failed: t("failed"),
					danger: true,
					run: () => props.purge()
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: open ? cls(ShellIntegrationCard_module_css_default.card, ShellIntegrationCard_module_css_default.cardOpen) : ShellIntegrationCard_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ShellIntegrationCard_module_css_default.header,
					"aria-expanded": open,
					"aria-controls": bodyId,
					"aria-label": `${t("expandLabel")}: ${t("title")}`,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ShellIntegrationCard_module_css_default.headText,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ShellIntegrationCard_module_css_default.name,
								children: t("title")
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ShellIntegrationCard_module_css_default.tag,
							"data-kind": chipState.kind,
							children: chipState.label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, { className: open ? cls(ShellIntegrationCard_module_css_default.chevron, ShellIntegrationCard_module_css_default.chevronOpen) : ShellIntegrationCard_module_css_default.chevron })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ShellIntegrationCard_module_css_default.body,
					id: bodyId,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ShellIntegrationCard_module_css_default.row,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ShellIntegrationCard_module_css_default.rowLabel,
							children: t("toggleLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "switch",
							"aria-checked": state.enabled,
							"aria-label": t("toggleLabel"),
							className: switchClass,
							disabled: !state.writable || state.saving,
							onClick: () => {
								props.setEnabled(!state.enabled);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: ShellIntegrationCard_module_css_default.thumb })
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ShellIntegrationCard_module_css_default.footer,
						children: [state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ShellIntegrationCard_module_css_default.failed,
							role: "alert",
							children: t("failed")
						}) : state.saving ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ShellIntegrationCard_module_css_default.note,
							role: "status",
							children: t("saving")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: ShellIntegrationCard_module_css_default.spacer }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ShellIntegrationCard_module_css_default.danger,
							disabled: !state.writable || state.saving,
							onClick: () => {
								confirmDelete();
							},
							children: t("deleteLabel")
						})]
					})]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"settingsScope"
		];
		/**
		* Register the card and the deep-link handler.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const controller = new ShellIntegrationCardController(ctx.settingsScope.bind({ namespace: SHELL_SETTINGS_NAMESPACE }));
			ctx.effect(() => () => controller.dispose(), "dsh-open-in-dsh: card controller");
			ctx.effect(() => ctx.locale.register(LOCALE_NS, {
				zh,
				en
			}), "dsh-open-in-dsh: dictionaries");
			const unregisterCard = ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: SHELL_SETTINGS_NAMESPACE,
				locale: LOCALE_NS,
				inject: () => controller.inject()
			}, ShellIntegrationCard));
			controller.afterPurge(() => {
				unregisterCard();
			});
			handleWorkspaceDeepLink(ctx);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map