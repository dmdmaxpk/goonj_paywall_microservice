
class Constants {
    constructor({}) {
        this.subscription_messages = {
            
            QDfC: `Free %trial_hours%hrs Goonj tv trial activate kar dia gya hai.Top channels dekhny k liye www.goonj.pk aur unsub k liye click goonj.pk/unsubscribe?proxy=%user_id%&pg=%pkg_id%`,
            QDfG: `Free %trial_hours%hrs Goonj tv trial activate kar dia gya hai.Top channels dekhny k liye www.goonj.pk aur unsub k liye click goonj.pk/unsubscribe?proxy=%user_id%&pg=%pkg_id%`,                            
            QDfH: `Your Goonj TV subscription for Comedy Portal has been activated at Rs.%price%/day. Thankyou for watching Goonj Comedy`,
            QDfI: `Your Goonj TV subscription for Comedy Portal has been activated at Rs.%price%/week. Thankyou for watching Goonj Comedy`,
            gdn:`Apko Goonj TV activate kr dia gaya ha. Jub chahien Jaib se Mobile nikalien aur TOP LIVE TV Channels deikhen.`
        },
        this.subscription_messages_direct = {
            QDfC: `Goonj Live TV Rs %price%/d subscribe kar diya gya hai. TV dekhnay k liye www.goonj.pk aur unsub k liye click www.goonj.pk/unsubscribe?proxy=%user_id%&pg=%pkg_id%`,
            QDfG: `Goonj Live TV Rs %price%/wk subscribe kar diya gya hai. TV dekhnay k liye www.goonj.pk aur unsub k liye click www.goonj.pk/unsubscribe?proxy=%user_id%&pg=%pkg_id%`,
            QDfH: `Goonj Comedy Rs%price% mein subscribe kar di gaye hai. Service dekhne k liye www.goonj.pk/home aur numainday se baat ke liye 727200 milayein.`,
            QDfI: `Goonj Comedy Rs%price% mein subscribe kar di gaye hai. Service dekhne k liye www.goonj.pk/home aur numainday se baat ke liye 727200 milayein.`,
        },
        this.message_after_repeated_succes_charge = {
            QDfC: `Goonj Live TV Rs. 5/day dekhnay ka shukriya.. Goonj TV Deikhnay k liay ya package ki tabdeli k liay click karein. www.goonj.pk/home`,
            QDfG: `Goonj tv dekhny ka shukriya. Goonj Tv dekhnay k liay ya package ki tabdeli k liay click karein. www.goonj.pk/home`,                            
            QDfH: `Ap Pakistan ki best Comedy Portal service istamal kar rahey hain. Service Deikhnay ya Package ki tabdeeli k liay click karein. www.goonj.pk/home`,
            QDfI: `Ap Pakistan ki best Comedy Portal service istamal kar rahey hain. Service Deikhnay ya Package ki tabdeeli k liay click karein. www.goonj.pk/home`
        }

        this.message_after_first_successful_charge = {
            QDfC: `Ap Pakistan ki best Live TV service istmal kar rahey hain. Live tv dekhny k liye goonj.pk aur unsub k liye click goonj.pk/unsubscribe?proxy=%user_id%&pg=%pkg_id%`,
            QDfG: `Ap Pakistan ki best Live TV service istmal kar rahey hain. Live tv dekhny k liye goonj.pk aur unsub k liye click goonj.pk/unsubscribe?proxy=%user_id%&pg=%pkg_id%`,                            
            QDfH: `Ap Pakistan ki best Comedy Portal service istamal kar rahey hain. Service Deikhnay ya Package ki tabdeeli k liay click karein. www.goonj.pk/home`,
            QDfI: `Ap Pakistan ki best Comedy Portal service istamal kar rahey hain. Service Deikhnay ya Package ki tabdeeli k liay click karein. www.goonj.pk/home`
        }
    }

}

module.exports = Constants;