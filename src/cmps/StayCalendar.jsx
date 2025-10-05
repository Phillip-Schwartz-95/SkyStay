import DatePicker from "react-datepicker"

export function StayCalendar({ stay, reservedDates, checkIn, setCheckIn, checkOut, setCheckOut }) {
  return (
    <div className="stay-calendar-large">
      <h2>
        {checkIn && checkOut
          ? `${Math.ceil((new Date(checkOut)-new Date(checkIn))/(1000*60*60*24))} nights in ${stay.loc?.city}`
          : "Select your stay dates"}
      </h2>

      <DatePicker
        selectsRange
        startDate={checkIn}
        endDate={checkOut}
        onChange={(dates) => {
          const [start, end] = dates
          setCheckIn(start)
          setCheckOut(end)
        }}
        monthsShown={2}
        inline
        excludeDates={reservedDates.map(d => new Date(d))}   // shared
        minDate={new Date()}
        calendarClassName="airbnb-calendar"
      />
    </div>
  )
}
