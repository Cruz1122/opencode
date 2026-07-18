import { createMemo, createSignal } from "solid-js"
import { sortBy } from "remeda"
import { useSync } from "../context/sync"
import { useSDK } from "../context/sdk"
import { useDialog } from "../ui/dialog"
import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select"
import { useToast } from "../ui/toast"
import { DialogModel } from "./dialog-model"
import { parseModel } from "../context/local"

const ALL = "*all*"

function modelLabel(model?: { providerID: string; modelID: string } | string) {
  if (!model) return "parent"
  if (typeof model === "string") return model
  return `${model.providerID}/${model.modelID}`
}

function effectiveLabel(
  agentModel: { providerID: string; modelID: string } | undefined,
  globalModel: string | undefined,
) {
  if (agentModel) return modelLabel(agentModel)
  if (globalModel) return `global · ${globalModel}`
  return "parent"
}

export function DialogSubagentModel() {
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()
  const toast = useToast()
  const [loading, setLoading] = createSignal(false)

  const globalModel = createMemo(() => sync.data.config.subagent_model?.trim() || undefined)

  const options = createMemo(() => {
    const global = globalModel()
    const agents = sortBy(
      sync.data.agent.filter((agent) => agent.mode !== "primary" && agent.hidden !== true),
      (agent) => agent.name,
    ).map((agent) => ({
      value: agent.name,
      title: agent.name,
      description: agent.native ? "native" : agent.description,
      footer: effectiveLabel(agent.model, global),
      category: "Per subagent",
    }))

    return [
      {
        value: ALL,
        title: "All subagents",
        description: "Default when a subagent has no model of its own",
        footer: global ? modelLabel(global) : "parent",
        category: "Global",
      },
      ...agents,
    ]
  })

  async function patch(config: { subagent_model?: string; agent?: Record<string, { model: string }> }) {
    if (loading()) return
    setLoading(true)
    try {
      await sdk.client.global.config.update({ config })
    } catch (error) {
      toast.show({
        message: error instanceof Error ? error.message : "Failed to update subagent model",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const actions = createMemo(() => [
    {
      command: "dialog.subagent.inherit",
      title: "Inherit parent",
      onTrigger: async (option: DialogSelectOption<string>) => {
        if (option.value === ALL) {
          await patch({ subagent_model: "" })
          return
        }
        await patch({ agent: { [option.value]: { model: "" } } })
      },
    },
  ])

  return (
    <DialogSelect
      title="Subagent models"
      options={options()}
      actions={actions()}
      onSelect={(option) => {
        if (option.value === ALL) {
          const current = globalModel()
          dialog.replace(() => (
            <DialogModel
              title="Default for all subagents"
              current={current ? parseModel(current) : undefined}
              onSelectModel={(model) => {
                void patch({ subagent_model: `${model.providerID}/${model.modelID}` })
              }}
            />
          ))
          return
        }
        const agent = sync.data.agent.find((item) => item.name === option.value)
        dialog.replace(() => (
          <DialogModel
            title={`Model for ${option.value}`}
            current={agent?.model}
            onSelectModel={(model) => {
              void patch({ agent: { [option.value]: { model: `${model.providerID}/${model.modelID}` } } })
            }}
          />
        ))
      }}
    />
  )
}
