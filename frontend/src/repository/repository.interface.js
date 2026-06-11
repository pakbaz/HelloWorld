/**
 * @typedef {Object} Prompt
 * @property {string|number} [id]
 * @property {string} title
 * @property {string} body
 * @property {number} [version]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} Variable
 * @property {string|number} [id]
 * @property {string|number} prompt_id
 * @property {string} name
 * @property {string|null} [default_value]
 */

/**
 * @typedef {Object} Tag
 * @property {string|number} [id]
 * @property {string} name
 */

/**
 * @interface PromptRepository
 *
 * getPrompts(): Promise<Prompt[]>
 * savePrompt(prompt: Prompt): Promise<Prompt>
 * deletePrompt(promptId: string|number): Promise<void>
 * getVariables(promptId: string|number): Promise<Variable[]>
 * saveVariables(promptId: string|number, variables: Variable[]): Promise<Variable[]>
 * deleteVariable(variableId: string|number): Promise<void>
 * getTags(): Promise<Tag[]>
 * saveTag(tag: Tag): Promise<Tag>
 * deleteTag(tagId: string|number): Promise<void>
 * setPromptTags(promptId: string|number, tagIds: Array<string|number>): Promise<void>
 */
module.exports = {};
