// import { DateInput, IDateInputProps, IDatePickerShortcut } from '@blueprintjs/datetime';
// import { IDateInputState } from '@blueprintjs/datetime/lib/esm/dateInput';

// type Props = {
//   dateInputProps: IDateInputProps
//   onShortcutChange(): void
//   selectedShortcutIndex: number
// }

// class DateInputShortcuts extends DateInput {
//   static getDerivedStateFromProps(props: any, state: any) {
//     const { selectedShortcutIndex } = props;
//     if (typeof selectedShortcutIndex === 'number') {
//       return { ...state, selectedShortcutIndex };
//     }

//     return state;
//   }

//   handleShortcutChange = (shortcut: IDatePickerShortcut, selectedShortcutIndex: number) => {
//     const { onShortcutChange } = this.props;
//     if (onShortcutChange) {
//       onShortcutChange(shortcut, selectedShortcutIndex);
//     }
//     this.setState({ selectedShortcutIndex });
//   };
// }

// export default DateInputShortcuts;