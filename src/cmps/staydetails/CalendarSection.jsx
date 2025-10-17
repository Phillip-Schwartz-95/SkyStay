// /pages/StayDetails/parts/StayCalendarSection.jsx
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../../../assets/styles/cmps/stay/StayCalendar.css'

export function StayCalendarSection({
  city,
  checkIn,
  checkOut,
  onChangeDates,
  reservedDates = [],
}) {
  const nights =
    checkIn && checkOut
      ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
      : null

  return (
    <section className="stay-calendar">
      <h2>{nights ? `${nights} nights in ${city}` : 'Select your stay dates'}</h2>

      <DatePicker
        selectsRange
        startDate={checkIn}
        endDate={checkOut}
        onChange={([start, end]) => onChangeDates(start, end)}
        monthsShown={2}
        inline
        excludeDates={reservedDates.map(d => new Date(d))}
        minDate={new Date()}
        calendarClassName="airbnb-calendar"
      />
    </section>
  )
}