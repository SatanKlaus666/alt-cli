import { useStore } from '@tanstack/react-store'
import { counterStore } from '~/lib/demo-store'

export const storeDevtoolsPlugin = {
  name: 'TanStack Store',
  render: (
    <div className="p-4 text-sm">
      <h3 className="font-semibold mb-2">Counter Store</h3>
      <StoreInspector />
    </div>
  ),
}

function StoreInspector() {
  const state = useStore(counterStore)
  return (
    <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
      {JSON.stringify(state, null, 2)}
    </pre>
  )
}
