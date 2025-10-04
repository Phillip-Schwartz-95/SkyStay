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
        selected={checkIn}
        onChange={(date) => setCheckIn(date)}
        startDate={checkIn}
        endDate={checkOut}
        selectsStart
        inline
        excludeDates={reservedDates.map(d => new Date(d))}
      />

      <DatePicker
        selected={checkOut}
        onChange={(date) => setCheckOut(date)}
        startDate={checkIn}
        endDate={checkOut}
        selectsEnd
        inline
        excludeDates={reservedDates.map(d => new Date(d))}
        minDate={checkIn}
      />
    </div>
  )
}
