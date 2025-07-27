# Vue 3 Coding Guidelines for GitHub Copilot

This document serves as a comprehensive guide for GitHub Copilot to generate Vue
3 code that follows best practices and conventions. It includes essential,
strongly recommended, and recommended rules along with best practices for
accessibility, performance, security, and scaling.

## Component Organization

### File Structure

- Use Single File Components (SFC) with the `.vue` extension
- Name component files using PascalCase (e.g., `UserProfile.vue`)
- Organize components by feature or route in dedicated directories
- Use index files to export multiple components from a directory

### Component Naming

- Use multi-word component names to avoid conflicts with HTML elements
- Use PascalCase for component names in JavaScript/TypeScript
- Use kebab-case when referencing components in templates
- Use base prefixes for generic components (e.g., `BaseButton.vue`,
  `BaseIcon.vue`)

## Template Structure

### Essential Rules

- Use v-for with a key attribute

```vue
<div v-for="item in items" :key="item.id">{{ item.text }}</div>
```

- Avoid v-if with v-for on the same element

```vue
<!-- Incorrect -->
<div
	v-for="item in items"
	v-if="item.isVisible"
	:key="item.id"
>{{ item.text }}</div>

<!-- Correct -->
<template v-for="item in items" :key="item.id">
	<div v-if="item.isVisible">{{ item.text }}</div>
</template>
```

- Use component scoped slots over complex prop passing

```vue
<UserList>
  <template v-slot:user="{ user }">
    <UserProfile :user="user" />
  </template>
</UserList>
```

### Strongly Recommended

- Use self-closing components when they have no content

```vue
<UserAvatar />
```

- Order template attributes consistently (v-directives, :props, @events, regular
  attributes)

```vue
<component
	v-if="condition"
	v-model="data"
	:prop="value"
	@event="handler"
	class="my-class"
/>
```

- Use shorthand syntax for directives when possible (:, @, #)

```vue
<component :prop="value" @click="handler" />
```

## JavaScript/TypeScript

### Composition API

- Prefer Composition API over Options API for new projects
- Use `<script setup>` syntax for simpler and more concise components

```vue
<script setup>
	import {ref, computed} from 'vue'

	const count = ref(0)
	const doubleCount = computed(() => count.value * 2)

	function increment() {
		count.value++
	}
</script>
```

- Define props using `defineProps` with type validation

```vue
<script setup>
	const props = defineProps({
		status: {
			type: String,
			required: true,
			validator: value => ['active', 'inactive'].includes(value),
		},
	})
</script>
```

- Use `defineEmits` to declare emitted events

```vue
<script setup>
	const emit = defineEmits(['update', 'delete'])

	function updateItem() {
		emit('update', {id: 1})
	}
</script>
```

- Use TypeScript for better type checking and IDE support

```vue
<script setup lang="ts">
	import {ref} from 'vue'

	interface User {
		id: number
		name: string
		email: string
	}

	const user = ref<User | null>(null)
</script>
```

### Reactivity

- Use `ref()` for primitive values and `reactive()` for objects
- Avoid nested reactivity with `reactive()` objects
- Use `toRefs()` when destructuring reactive objects to maintain reactivity

```vue
<script setup>
	import {reactive, toRefs} from 'vue'

	const state = reactive({count: 0, name: 'Vue'})
	const {count, name} = toRefs(state)
</script>
```

### Computed Properties & Watchers

- Use computed properties for derived state

```vue
const fullName = computed(() => `${firstName.value} ${lastName.value}`)
```

- Use watchers for side effects

```vue
watch(searchQuery, async (newValue) => { if (newValue.length > 2) { await
fetchResults(newValue) } }, { debounce: 300 })
```

## State Management

### Small to Medium Applications

- Use provide/inject for deep prop passing

```vue
<!-- Parent component -->
<script setup>
	import {provide, ref} from 'vue'

	const theme = ref('light')
	provide('theme', theme)
</script>

<!-- Child component -->
<script setup>
	import {inject} from 'vue'

	const theme = inject('theme')
</script>
```

- Use composables for shared stateful logic

```js
// useCounter.js
import {ref} from 'vue'

export function useCounter() {
	const count = ref(0)

	function increment() {
		count.value++
	}

	return {
		count,
		increment,
	}
}
```

### Large Applications

- Consider Pinia for global state management

```js
// store/users.js
import {defineStore} from 'pinia'

export const useUsersStore = defineStore('users', {
	state: () => ({
		users: [],
		loading: false,
	}),
	actions: {
		async fetchUsers() {
			this.loading = true
			try {
				this.users = await api.getUsers()
			} finally {
				this.loading = false
			}
		},
	},
})
```

- Organize stores by feature and keep them focused
- Use store composition patterns for shared logic

## Performance Optimization

### Rendering Performance

- Use `v-memo` to memoize parts of templates that depend on specific values

```vue
<div v-memo="[item.id, item.updated]">
  {{ item.name }}
</div>
```

- Use `v-once` for content that never changes

```vue
<div v-once>{{ staticContent }}</div>
```

- Use the `key` attribute correctly for efficient list rendering
- Avoid unnecessary component wrappers

### Computed and Watcher Optimization

- Make computed properties as simple as possible
- Use computed getters for read-only properties
- Use watcher debouncing for expensive operations

### Lazy Loading

- Use dynamic imports for route-level components

```js
const UserProfile = () => import('./UserProfile.vue')
```

- Implement virtual scrolling for long lists using libraries like
  `vue-virtual-scroller`

## Accessibility

### Semantic HTML

- Use appropriate HTML elements based on their semantic meaning
- Use ARIA attributes when HTML semantics are not sufficient

```vue
<div role="button" aria-pressed="false" @click="toggle">Toggle</div>
```

### Keyboard Navigation

- Ensure all interactive elements are keyboard accessible
- Implement proper focus management

```vue
<input ref="searchInput" @focus="handleFocus" />
```

### Screen Readers

- Provide accessible labels for form controls

```vue
<label for="username">Username</label>
<input id="username" v-model="username" />
```

- Use `aria-live` regions for dynamic content

```vue
<div aria-live="polite" role="status">{{ statusMessage }}</div>
```

### Color and Contrast

- Ensure sufficient color contrast (minimum ratio of 4.5:1)
- Don't rely solely on color to convey information

## Security

### XSS Prevention

- Use `v-html` sparingly and only with sanitized content
- Sanitize user-generated content before rendering

```vue
<div>{{ sanitizedHtml }}</div>

<script setup>
	import {computed} from 'vue'
	import DOMPurify from 'dompurify'

	const sanitizedHtml = computed(() => DOMPurify.sanitize(props.userContent))
</script>
```

### URL Handling

- Validate and sanitize URLs, especially in `href` attributes

```js
// Check if URL is safe before using
function isSafeURL(url) {
	const pattern = /^(https?:\/\/|mailto:|tel:)/i
	return pattern.test(url)
}
```

### Form Validation

- Implement both client-side and server-side validation
- Use appropriate input types and validation attributes

```vue
<input
	type="email"
	required
	pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
	v-model="email"
/>
```

### Data Handling

- Never store sensitive data in localStorage or sessionStorage
- Use HTTPS for all API requests
- Implement proper CSRF protection for API calls

## Testing

### Component Testing

- Test components in isolation using tools like Vitest and Vue Test Utils
- Create simple, focused test cases

```js
import {mount} from '@vue/test-utils'
import Counter from './Counter.vue'

test('increments count when button is clicked', async () => {
	const wrapper = mount(Counter)
	await wrapper.find('button').trigger('click')
	expect(wrapper.text()).toContain('Count: 1')
})
```

### Unit Testing

- Test composables and utility functions independently
- Mock external dependencies

### E2E Testing

- Use Cypress or Playwright for end-to-end testing
- Focus on critical user flows

## Build and Deployment

### Optimization

- Enable production mode when deploying
- Implement code splitting for better loading performance
- Configure proper caching strategies for assets
- Use modern build tools like Vite for faster development

### Asset Management

- Optimize images and other assets
- Use appropriate formats (WebP for images, etc.)
- Lazy load non-critical assets

## Documentation

### Component Documentation

- Document component props, events, and slots
- Provide usage examples
- Consider using Storybook for visual component documentation

### Project Documentation

- Maintain a clear README with setup instructions
- Document project architecture and conventions
- Include contribution guidelines
