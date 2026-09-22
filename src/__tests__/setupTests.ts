class FakeDragEvent extends Event {
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict);
  }
}

(globalThis as any).DragEvent = FakeDragEvent;
