import * as React from 'react'
import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import MenuItem from '@material-ui/core/MenuItem'
import { NumberField } from './number'
import { ValueTypes } from '../filter-builder/filter.structure'
import { DateInput, IDatePickerShortcut } from '@blueprintjs/datetime'
import { MuiOutlinedInputBorderClasses } from '../theme/theme'
import { DateHelpers } from './date-helpers'
import { clone } from '@blueprintjs/datetime/lib/esm/common/dateUtils'
import CalendarIcon from '@material-ui/icons/Event'

type Props = {
  value: ValueTypes['relative']
  onChange: (val: ValueTypes['relative']) => void
}

const defaultValue = {
  last: '1',
  unit: 'm',
  to: 'before-date',
  date: 'now'
} as ValueTypes['relative']

const validateShape = ({ value, onChange }: Props) => {
  if (isInvalid({ value, onChange })) {
    onChange(defaultValue)
  }
}

const isInvalid = ({ value }: Props) => {
  return value.last === undefined || value.unit === undefined
}

export const DateRelativeField = ({ value, onChange }: Props) => {
  const [date, setDate] = React.useState('now')
  React.useEffect(() => {
    onChange({
      ...defaultValue,
      ...value,
      date,
    }
    )
  }, [date]) 
  React.useEffect(() => {
    validateShape({ value, onChange })
  }, [])
  if (isInvalid({ value, onChange })) {
    // for most cases it doesn't matter if we render with invalid, but the select will immediately cause onChange which has some weird side effects
    return null
  }
  return (
    <Grid container direction="column" className="w-full">
      <Grid item className="w-full pb-2 pl-2">
        for
      </Grid>
      <Grid container direction="row" className="w-full">
      <Grid item xs={4} className="pb-2 pr-2">
        <NumberField
          type="float"
          onChange={(val) => {
            if (onChange)
              onChange({
                ...defaultValue,
                ...value,
                last: val,
              })
          }}
          {...(value
            ? {
                value: value.last,
              }
            : {})}
        />
      </Grid>
      <Grid item xs={8} className="pb-2">
        <TextField
          fullWidth
          variant="outlined"
          select
          onChange={(e) => {
            if (onChange)
              onChange({
                ...defaultValue,
                ...value,
                unit: e.target.value as ValueTypes['relative']['unit'],
              })
          }}
          size="small"
          value={value.unit}
        >
          <MenuItem value="m">Minutes</MenuItem>
          <MenuItem value="h">Hours</MenuItem>
          <MenuItem value="d">Days</MenuItem>
          <MenuItem value="M">Months</MenuItem>
          <MenuItem value="y">Years</MenuItem>
        </TextField>
      </Grid>
      </Grid>
      <Grid item className="pb-2 w-full">
        <TextField
          fullWidth
          variant="outlined"
          select
          onChange={(e) => {
            if (onChange)
              onChange({
                ...defaultValue,
                ...value,
                to: e.target.value as ValueTypes['relative']['to'],
              })
          }}
          size="small"
          value={value.to}
        >
          <MenuItem value="before-date">Before</MenuItem>
          <MenuItem value="after-date">After</MenuItem>
          <MenuItem value="around-date">Around</MenuItem>
        </TextField>
      </Grid>
      <DateInput
        rightElement= {(<CalendarIcon/>)}
        className={MuiOutlinedInputBorderClasses}
        closeOnSelection={false}
        fill
        formatDate={(dateToFormat: Date) => {
          if(date === 'now'){
            return "Now"
          }
          return DateHelpers.Blueprint.commonProps.formatDate(dateToFormat)
        }}
        onChange={DateHelpers.Blueprint.DateProps.generateOnChange(setDate)}
        parseDate={DateHelpers.Blueprint.commonProps.parseDate}
        placeholder={'M/D/YYYY'}
        todayButtonText="Now"
        // shortcuts={createDefaultShortcuts()}
        timePrecision="minute"
        dayPickerProps={{
          todayButton: "Now",
          onTodayButtonClick: () => {
            console.log("Today Button Clicked")
            setDate('Now')
          },
        }}
        {...(value.date ? {
              value: DateHelpers.Blueprint.DateProps.generateValue(value.date),
            }
          : {}
          )
        }
      />
    </Grid>
  )
}

const createShortcut = (label: string, date: Date | undefined) => {
  return {date, label, includeTime: true} as IDatePickerShortcut
}

const createDefaultShortcuts = () => {
  const today = new Date();
  const makeDate = (action: (d: Date) => void) => {
      const returnVal = clone(today);
      action(returnVal);
      returnVal.setDate(returnVal.getDate() + 1);
      return returnVal;
  };

  const yesterday = makeDate(d => d.setDate(d.getDate() - 2));
  const oneWeekAgo = makeDate(d => d.setDate(d.getDate() - 7));
  const oneMonthAgo = makeDate(d => d.setMonth(d.getMonth() - 1));
  const threeMonthsAgo = makeDate(d => d.setMonth(d.getMonth() - 3));
  const sixMonthsAgo = makeDate(d => d.setMonth(d.getMonth() - 6));
  const oneYearAgo = makeDate(d => d.setFullYear(d.getFullYear() - 1));
  const twoYearsAgo = makeDate(d => d.setFullYear(d.getFullYear() - 2));

  return [
    createShortcut("Now", new Date()),
    createShortcut("Today", today),
    createShortcut("Yesterday", yesterday),
    createShortcut("1 week ago", oneWeekAgo),
    createShortcut( "1 month ago", oneMonthAgo),
    createShortcut( "3 months ago", threeMonthsAgo),
    createShortcut("Past 6 months", sixMonthsAgo),
    createShortcut( "1 year ago", oneYearAgo),
    createShortcut("Past 2 years", twoYearsAgo),
  ];
}
